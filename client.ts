/// <reference types="leaflet" />
/// <reference types="bootstrap" />
/// <reference types="vis" />

type Dict<T> = Partial<Record<string, T>>

// -------- Types: SturmovikCampaign's WebController
type Coalition = "Allies" | "Axis"

interface Vector2 {
    X: number
    Y: number
}

interface Airfield {
    Id: string
    Position: Vector2
    Region: string
}

interface Region {
    Id: string
    Boundary: Vector2[]
    Position: Vector2
    InitialOwner: Coalition | null
}
 
interface PlaneModel {
    Name: string
}

interface World {
    Scenario: string
    Map: string
    MapSouthWest: Vector2
    MapNorthEast: Vector2
    Regions: Region[]
    Airfields: Airfield[]
    PlaneSet: PlaneModel[]
}

interface DateTime {
    Year: number
    Month: number
    Day: number
    Hour: number
    Minute: number
}

function dateToStr(date: DateTime): string {
    return `${date.Year}-${dig2(date.Month)}-${dig2(date.Day)} ${date.Hour}:${dig2(date.Minute)}`
}

interface GroundForces {
    Region: string
    Coalition: Coalition
    Forces: number
}

interface WarState {
    Date: DateTime
    GroundForces: GroundForces[]
    RegionOwner: Dict<Coalition>
    Planes: Dict<Dict<number>>
}

type ValueType = number | string | object | Dict<number | string | object>

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

// -------- Utility functions

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

// Get the keys of a Dict
function keysOf<T>(dict : Dict<T> | null | undefined) {
    return Object.getOwnPropertyNames(dict)
}

// Get the values in a Dict
function valuesOf<T>(dict : Dict<T> | null | undefined): T[] {
    if (dict == null || dict == undefined)
        return []
    let ret: T[] = []
    const values = keysOf(dict).map(k => dict[k])
    for(const v of values) {
        if (v != undefined) ret.push(v)
    }
    return ret
}

interface ValueRange {
    min: number
    max: number
}

function widenRange(range: ValueRange, x: number) {
    if (range.min > x) range.min = x
    if (range.max < x) range.max = x
}

function enlarged(range: ValueRange) {
    const w = range.max - range.min
    return {
        min: range.min - 0.05 * w,
        max: range.max + 0.05 * w
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

// Set to a proper transformation from game world coordinates to Leaflet coordinates upon reception of world data
let transform = (v : Vector2): L.LatLng => new L.LatLng(v.X, v.Y);

// Get world data: Static information about regions, airfields...
async function getWorldData() {
    const response = await fetch(config.campaignServerUrl + "/query/world")
    if (!response.ok)
        return null
    const world : World = await response.json()
    const mapName = world.Map
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
    return world
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
function fetchDayData(world: World, idx: number) {
    return async () => {
        const query = `/query/past/${idx}`
        const dayResponse = await fetch(config.campaignServerUrl + query)
        // Draw region borders
        if (dayResponse.ok) {
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
function newEntry(world: World, idx: number, label: string) {
    const li = document.createElement("li")
    li.addEventListener("click", fetchDayData(world, idx))
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
async function getDays(world: World) {
    if (dayslist == null)
        return null
    const response = await fetch(config.campaignServerUrl + "/query/dates")
    if (!response.ok)
        return null

    const dates = await response.json() as DateTime[]
    
    for (let index = 0; index < dates.length; index++) {
        const date = dates[index];
        dayslist.appendChild(newEntry(world, index, dateToStr(date)))                
    }
    return dates
}

async function buildGraph(world: World, dates: DateTime[]) {
    if (graphDiv == null)
        return
    let states = new Array<WarState>()
    let items: any[] = []
    let groundForcesRange = { min: 0, max: 0 }
    let planesRange = { min: 0, max: 0 }
    for (let i = 0; i < dates.length; ++i) {
        const date = dateToStr(dates[i])
        const response = await fetch(config.campaignServerUrl + `/query/past/${i}`)
        if (response.ok) {
            const data: WarState = await response.json()
            states.push(data)
            function totalGroundForces(coalition: Coalition) {
                const total = data.GroundForces.filter(value => value.Coalition == coalition).map(value => value.Forces).reduce((x, y) => x + y, 0)
                widenRange(groundForcesRange, total)
                return total
            }
            function regionsOf(coalition: Coalition) {
                return world.Regions.filter(reg => data.RegionOwner[reg.Id] == coalition)
            }
            function airfieldsOf(coalition: Coalition) {
                return world.Airfields.filter(af => data.RegionOwner[af.Region] == coalition)
            }
            function planesInCoalition(coalition: Coalition) {
                const planes = airfieldsOf(coalition).flatMap(af => valuesOf(data.Planes[af.Id]) ?? 0).reduce((x, y) => x + y, 0)
                widenRange(planesRange, planes)
                return planes
            }
            items.push({
                x: date,
                y: totalGroundForces("Axis"),
                group: "ground-forces-axis"
            })
            items.push({
                x: date,
                y: totalGroundForces("Allies"),
                group: "ground-forces-allies"
            })
            items.push({
                x: date,
                y: planesInCoalition("Axis"),
                group: "air-forces-axis"
            })
            items.push({
                x: date,
                y: planesInCoalition("Allies"),
                group: "air-forces-allies"
            })
        }
    }
    const dataset = new vis.DataSet(items)
    const groups = new vis.DataSet()
    groups.add({
        id: "ground-forces-axis",
        content: "Ground forces (Axis)",
        options: {
            yAxisOrientation: "right"
        }
    })
    groups.add({
        id: "ground-forces-allies",
        content: "Ground forces (Allies)",
        visible: true,
        options: {
            yAxisOrientation: "right"
        }
    })
    groups.add({
        id: "air-forces-axis",
        content: "Planes (Axis)",
        options: {
            yAxisOrientation: "left"
        }
    })
    groups.add({
        id: "air-forces-allies",
        content: "Planes (Allies)",
        options: {
            yAxisOrientation: "left"
        }
    })
    console.debug(groundForcesRange)
    const graph = new vis.Graph2d(graphDiv, dataset, groups, {
        legend: true,
        dataAxis: {
            alignZeros: true,
            left: {
                range: enlarged(planesRange)
            },
            right: {
                range: enlarged(groundForcesRange)
            }
        }
    })
    return graph
}

// Load the world and setup the UI when the map is ready
map.on("load", async() => {
    console.info("viewreset event called")

    const world = await getWorldData()
    if (world == null)
        return
    const dates = await getDays(world)
    if (dates != null) {
        const graph = await buildGraph(world, dates)
        graph?.fit()
    }

})

// Debug: show leaflet coordinates when clicking on the map
map.on("click", async(args: L.LeafletMouseEvent) => {
    console.info(args.latlng)
})

map.fitWorld()