/// <reference types="leaflet" />
/// <reference types="bootstrap" />

interface Vector2 {
    X: number
    Y: number
}

interface Airfield {
    Id: string
    Position: Vector2
}

interface Region {
    Id: string
    Boundary: Vector2[]
    Position: Vector2
    InitialOwner: string
}

interface World {
    Scenario: string
    Map: string
    MapSouthWest: Vector2
    MapNorthEast: Vector2
    Regions: Region[]
    Airfields: Airfield[]
}

interface DateTime {
    Year: number
    Month: number
    Day: number
    Hour: number
    Minute: number
}

interface GroundForces {
    Region: string
    Coalition: string
    Forces: number
}

interface WarState {
    Date: DateTime
    GroundForces: GroundForces[]
    RegionOwner: Record<string, string>
}

type ValueType = number | string | object | Record<string, number | string | object>

interface Command {
    Verb: string
    Args: Record<string, ValueType>
}

function commandToHtml(cmd: Command) {
    const p = document.createElement("p")
    const txt = document.createTextNode(cmd.Verb)
    p.appendChild(txt)
    return p
}

interface Result {
    ChangeDescription: string
    Values: Record<string, ValueType>
}

function resultToHtml(result: Result) {
    const li = document.createElement("li")
    const txt = document.createTextNode(result.ChangeDescription)
    li.appendChild(txt)
    return li
}

interface SimulationStep {
    Description: string
    Command: Command[]
    Results: Result[]
}

function simulationStepToHtml(step : SimulationStep) {
    const div = document.createElement("div")
    const p = document.createElement("p")
    const small = document.createElement("small")
    const txt = document.createTextNode(step.Description)
    small.appendChild(txt)
    p.appendChild(small)
    div.appendChild(p)
    return div
}

class RegionWithOwner {
    properties: Region
    owner: string

    constructor(region: Region, owner: string) {
        this.properties = region
        this.owner = owner
    }

    get color() {
        if (this.owner == "Allies")
            return "red"
        else if (this.owner == "Axis")
            return "blue"
        else
            return "gray"
    }
}

// A silly function to print minutes, month and day numbers nicely, with 2 digits and a leading 0 if needed.
function dig2(n: number): string {
    if (n < 10) 
        return "0" + n.toString()
    return n.toString()
}

type DrawPolyLineFun = (vs: Vector2[], color: string) => void

class BorderRenderer {
    regions: Map<string, RegionWithOwner>

    drawPolyLine: DrawPolyLineFun

    constructor(drawPolyLine: DrawPolyLineFun, world: World, state: WarState) {
        this.drawPolyLine = drawPolyLine
        this.regions = new Map()
        for (const region of world.Regions) {
            const owner = state.RegionOwner[region.Id] ?? "Neutral"
            const ro = new RegionWithOwner(region, owner)
            this.regions.set(region.Id, ro)
        }
    }

    drawBorders() {
        for (const region of this.regions.values()) {
            const vertices = region.properties.Boundary
            const color = region.color
            this.drawPolyLine(vertices, color)
        }
    }
}

const config = {
    campaignServerUrl: "http://127.0.0.1:8080",
}

const bounds = {
    rheinland: new L.LatLngBounds([-90, -180], [68.27, 15.74])
}

function getMapBounds(mapName: string) {
    switch(mapName) {
        case "rheinland-summer": return bounds.rheinland;
        default: return undefined;
    }
}

let map = new L.Map("mapid", {
    crs: L.CRS.EPSG4326
})

let daysPolys: L.Polyline[] = []

const dayslist = document.getElementById("list-days")

const dayEvents = document.getElementById("list-events")

const mapTiles = new L.TileLayer("https://tiles.il2missionplanner.com/rheinland/{z}/{x}/{y}.png",
    {
        tms: true,
        noWrap: true,
        minNativeZoom: 2,
        maxNativeZoom: 7,
        zoomOffset: 1,
        attribution: "il2missionplanner.com"
    })
mapTiles.addTo(map)

// World data, set when the view is reset
let world : World | undefined = undefined

// Set to a proper transformation from game world coordinates to Leaflet coordinates upon reception of world data
let transform = (v : Vector2): L.LatLng => new L.LatLng(v.X, v.Y);

map.on("viewreset", async() => {
    console.info("viewreset event called")
    const response = await fetch(config.campaignServerUrl + "/query/world")
    if (response.ok) {
        world = await response.json()
        if (world != undefined) {
            const mapName : string = world.Map
            const bounds = getMapBounds(mapName)
            if (bounds != undefined) {
                const mapSW = world.MapSouthWest
                const mapNE = world.MapNorthEast
                const mapWidth = mapNE.Y - mapSW.Y
                const mapHeight = mapNE.X - mapSW.X
                const leafWidth = bounds.getEast() - bounds.getWest()
                const leafHeight = bounds.getNorth() - bounds.getSouth()
                transform = (v : Vector2) =>
                    new L.LatLng(
                        bounds.getSouth() + leafHeight * (v.X - mapSW.X) / mapHeight,
                        bounds.getWest() + leafWidth * (v.Y - mapSW.Y) / mapWidth);
            }
            else {
                console.error(`Bounds for map '${mapName}' are unknown`)
            }
            for (let i = 0; i < world.Regions.length; i++) {
                const region = world.Regions[i];
                let m = L.marker(transform(region.Position), {
                    title: region.Id,
                    alt: `Region ${region.Id}`
                }).addTo(map)
            }
        }
    }
    else {
        console.info("viewreset: Response status was not OK")
    }

    // Get the list of days
    if (dayslist != null) {
        const response = await fetch(config.campaignServerUrl + "/query/dates")
        if (response.ok) {
            function setDaysButtonLabel(label: string) {
                const button = document.getElementById("btn-days")
                if (button != null) {
                    return () => {
                        (button.firstChild as Text).textContent = label
                    }
                }
                else {
                    return () => {}
                }
            }
            const dates = await response.json() as DateTime[]
            function newEntry(idx: number, label: string) {
                const li = document.createElement("li")
                async function fetchDayData(this: HTMLElement): Promise<any> {
                    const query = (idx != -1) ? `/query/past/${idx}` : "/query/current"
                    const dayResponse = await fetch(config.campaignServerUrl + query)
                    // Draw region borders
                    if (dayResponse.ok && world != undefined) {
                        const dayData = await dayResponse.json() as WarState
                        function drawPolyLine(vs: Vector2[], color: string) {
                            const ps = vs.map(transform)
                            ps.push(ps[0])
                            const poly = L.polyline(ps, { color: color })
                            daysPolys.push(poly)
                            poly.addTo(map)
                        }
                        const regionsWithOwners = new BorderRenderer(drawPolyLine, world, dayData)
                        for (const polyline of daysPolys) {
                            map.removeLayer(polyline)
                        }
                        daysPolys = []
                        regionsWithOwners.drawBorders()
                    }
                    // Remove all current existing entries
                    if (dayEvents != null) {
                        while (dayEvents.lastChild != null) {
                            dayEvents.removeChild(dayEvents.lastChild)
                        }
                    }
                    // Populate list of events
                    if (idx >= 0 && dayEvents != null) {
                        const dayActionResponse = await fetch(config.campaignServerUrl + `/query/simulation/${idx + 1}`)
                        if (dayResponse.ok) {
                            const dayActions = await dayActionResponse.json() as SimulationStep[]
                            for (const action of dayActions) {
                                dayEvents.appendChild(simulationStepToHtml(action))
                            }
                        }
                    }
                }        
                li.addEventListener("click", fetchDayData)
                li.addEventListener("click", setDaysButtonLabel(label))
                const a = document.createElement("a")
                const txt = new Text(label)
                a.appendChild(txt)
                li.appendChild(a)
                return li
            }
            dayslist.appendChild(newEntry(-1, "Latest"))
            for (let index = 0; index < dates.length; index++) {
                const date = dates[index];
                dayslist.appendChild(
                    newEntry(
                        index,
                        `${date.Year}-${dig2(date.Month)}-${dig2(date.Day)} ${date.Hour}:${dig2(date.Minute)}`))                
            }
        }
    }
    else {
        console.error("Could not find UL element 'dayslist'")
    }
})

map.on("click", async(args: L.LeafletMouseEvent) => {
    console.info(args.latlng)
})

map.fitWorld()