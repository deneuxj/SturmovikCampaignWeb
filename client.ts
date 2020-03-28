/// <reference types="leaflet" />
/// <reference types="bootstrap" />

// -------- Types: SturmovikCampaign's WebController
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
    const small = document.createElement("small")
    const txt = document.createTextNode(step.Description)
    small.appendChild(txt)
    return small
}

// Annotate a region with its current owner
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

// -------- Util functions

// A silly function to print minutes, month and day numbers nicely, with 2 digits and a leading 0 if needed.
function dig2(n: number): string {
    if (n < 10) 
        return "0" + n.toString()
    return n.toString()
}

// Remove all children from an HTML element
function removeAllChildren(elmt : HTMLElement) {
    while (elmt.lastChild != null) {
        elmt.removeChild(elmt.lastChild)
    }
}

// Signature of functions to draw polylines using the game's coordinate system
type DrawPolyLineFun = (vs: Vector2[], color: string) => void

// -------- Implementation

// Render regions and their borders, with colours according to owner
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

// Site-dependent configuration
const config = {
    campaignServerUrl: "http://127.0.0.1:8080",
    tilesUrlTemplate: "https://tiles.il2missionplanner.com/rheinland/{z}/{x}/{y}.png"
}

// Bounds of each map (regardless of season variants) in leaflet's coordinate system
const bounds = {
    rheinland: new L.LatLngBounds([-90, -180], [68.27, 15.74])
}

// Get the bounds (leaflet's coordinate system) of a specific map and season
function getMapBounds(mapName: string) {
    switch(mapName) {
        case "rheinland-summer": return bounds.rheinland;
        default: return undefined;
    }
}

// A constructor of a leaflet control to pick the day/date of the campaign step to display
const pickDayControl = L.Control.extend({
    onAdd: function(map: L.Map) {
        const div = document.createElement("div")
        div.setAttribute("class", "dropdown")
        div.innerHTML =
        `
            <button class="btn btn-secondary dropdown-toggle" type="button" id="btn-days" data-toggle="dropdown" aria-haspopup="true" aria-expanded="true">
                YYYY-MM-DD HH:MM
                <span class="caret"></span>
            </button>
            <div class="dropdown-menu" aria-labelledby="btn-days" id="list-days">
            </div>`
        return div
    },
    onRemove: function() {

    }
})

// The leaflet map
let map = new L.Map("mapid", {
    crs: L.CRS.EPSG4326
})

// The control to pick the day/date to display
const pickDay = new pickDayControl()
pickDay.addTo(map)

// The layers of the data of the day on the map
let daysPolys: L.Polyline[] = []

// Various HTML elements to hook on
const dayslist = document.getElementById("list-days")
const dayEvents = document.getElementById("list-events")
const propertiesCell = document.getElementById("col-properties")
const graphDiv = document.getElementById("visualization")

// The tile of the map, using il2missionplanner
const mapTiles = new L.TileLayer(config.tilesUrlTemplate,
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

// Get world data: Static information about regions, airfields...
async function getWorldData() {
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
}

// Set the label of the date picker button
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

// Get the state of the world on a given date identified by its index in the list of dates, and update the UI
function fetchDayData(idx: number) {
    return async () => {
        const query = `/query/past/${idx}`
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
        // Populate list of events
        if (dayEvents != null) {
            removeAllChildren(dayEvents)
            const dayActionResponse = await fetch(config.campaignServerUrl + `/query/simulation/${idx + 1}`)
            if (dayResponse.ok) {
                const dayActions = await dayActionResponse.json() as SimulationStep[]
                let isSecondary = false
                for (const action of dayActions) {
                    const content = simulationStepToHtml(action)
                    const entry = document.createElement("li")
                    entry.appendChild(content)
                    const classExtra = isSecondary? " list-group-item-secondary" : ""
                    entry.setAttribute("class", "list-group-item" + classExtra)
                    if (propertiesCell != null) {
                        entry.addEventListener("click", () => {
                            removeAllChildren(propertiesCell)
                            const small = document.createElement("small")
                            for (const cmd of action.Command) {
                                small.appendChild(commandToHtml(cmd))
                            }
                            if (action.Results.length > 0) {
                                const ul = document.createElement("ul")
                                ul.setAttribute("class", "list-group")
                                for (const result of action.Results) {
                                    const li = resultToHtml(result)
                                    li.setAttribute("class", "list-group-item")
                                    ul.appendChild(li)
                                }
                                small.appendChild(ul)
                            }
                            propertiesCell.appendChild(small)
                        })
                    }
                    dayEvents.appendChild(entry)
                    isSecondary = !isSecondary
                }
            }
        }
    }
}        

// Create a new entry in the date picker dropdown
function newEntry(idx: number, label: string) {
    const li = document.createElement("li")
    li.addEventListener("click", fetchDayData(idx))
    li.addEventListener("click", setDaysButtonLabel(label))
    const a = document.createElement("a")
    a.setAttribute("href", "#")
    a.setAttribute("class", "dropdown-item")
    const txt = new Text(label)
    a.appendChild(txt)
    li.appendChild(a)
    return li
}

// Get the list of dates in the campaign, and set UI event handlers
async function getDays() {
    if (dayslist == null)
        return null
    const response = await fetch(config.campaignServerUrl + "/query/dates")
    if (!response.ok)
        return null

    const dates = await response.json() as DateTime[]
    
    for (let index = 0; index < dates.length; index++) {
        const date = dates[index];
        dayslist.appendChild(
            newEntry(
                index,
                `${date.Year}-${dig2(date.Month)}-${dig2(date.Day)} ${date.Hour}:${dig2(date.Minute)}`))                
    }
    return dates
}

// Load the world and setup the UI when the map is ready
map.on("load", async() => {
    console.info("viewreset event called")

    await getWorldData()
    const dates = await getDays()
})

// Debug: show leaflet coordinates when clicking on the map
map.on("click", async(args: L.LeafletMouseEvent) => {
    console.info(args.latlng)
})

map.fitWorld()