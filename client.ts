/// <reference types="leaflet" />
/// <reference types="bootstrap" />
/// <reference types="plotly.js" />

type Dict<T> = Partial<Record<string, T>>

// -------- Types: SturmovikCampaign's WebController
type Coalition = "Allies" | "Axis"

interface Vector2 {
    X: number
    Y: number
}

interface OrientedPosition {
    Position: Vector2
    Altitude: number
    Rotation: number
}

interface BuildingProperties {
    Id: number
    Model: string
    Capacity: number
}

interface BuildingInstance {
    Position: OrientedPosition
    PropertiesId: number
}

interface Airfield {
    Id: string
    Position: Vector2
    Region: string
    Buildings: BuildingInstance[]
}

interface Region {
    Id: string
    Boundary: Vector2[]
    Position: Vector2
    InitialOwner: Coalition | null
    Buildings: BuildingInstance[]
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
    BuildingProperties: BuildingProperties[]
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

interface BuildingStatus {
    Position: OrientedPosition
    HealthLevel: number
    FunctionalityLevel: number
}

interface WarState {
    Date: DateTime
    GroundForces: GroundForces[]
    RegionOwner: Dict<Coalition>
    SupplyStatus: Dict<number>
    Planes: Dict<Dict<number>>
    BuildingHealth: BuildingStatus[]
}

interface DamageBuildingPartArgs {
    BuildingAt: OrientedPosition
    Part: number
    Damage: number
}

interface DamageBuildingPartCmd {
    Verb: "DamageBuildingPart"
    Args: DamageBuildingPartArgs
}

interface RepairBuildingPartArgs {
    BuildingAt: OrientedPosition
    Part: number
    Repair: number
}

interface RepairBuildingPartCmd {
    Verb: "RepairBuildingPart"
    Args: RepairBuildingPartArgs
}

interface AddRemovePlaneArgs {
    Airfield: string
    Plane: string
    Amount: number
}

interface AddRemovePlaneCmd {
    Verb: "RemovePlane" | "AddPlane"
    Args: AddRemovePlaneArgs
}

interface AddDestroyGroundForcesArgs {
    Region: string
    Coalition: Coalition
    Amount: number
}

interface AddDestroyGroundForcesCmd {
    Verb: "AddGroundForces" | "DestroyGroundForces"
    Args: AddDestroyGroundForcesArgs
}

interface MoveGroundForcesArgs {
    Start: string
    Destination: string
    Coalition: Coalition
    Amount: number
}

interface MoveGroundForcesCmd {
    Verb: "MoveGroundForces"
    Args: MoveGroundForcesArgs
}

interface SetRegionOwnerArgs {
    Region: string
    Coalition: Coalition
}

interface SetRegionOwnerCmd {
    Verb: "SetRegionOwner"
    Args: SetRegionOwnerArgs
}

interface AdvanceTimeArgs {
    Hours: number
}

interface AdvanceTimeCmd {
    Verb: "AdvanceTime"
    Args: AdvanceTimeArgs
}

interface OtherCmd {
    Verb: string
    Args: any
}

type Command = DamageBuildingPartCmd | RepairBuildingPartCmd | AddRemovePlaneCmd | AddDestroyGroundForcesCmd | MoveGroundForcesCmd | SetRegionOwnerCmd | AdvanceTimeCmd | OtherCmd

function commandToHtml(cmd: Command) {
    let description = undefined
    let args = undefined
    function astxt(s: string) { return document.createTextNode(s) }
    switch (cmd.Verb) {
        case "AddGroundForces":
            description = "Add ground forces"
            args = astxt(`In ${cmd.Args.Region}, for ${cmd.Args.Coalition}: ${cmd.Args.Amount}`)
            break
        case "DamageBuildingPart":
            description = "Damage building"
            args = astxt(`At ${cmd.Args.BuildingAt.Position.X}, ${cmd.Args.BuildingAt.Position.Y}, part ${cmd.Args.Part}: ${cmd.Args.Damage}`)
            break
        case "DestroyGroundForces":
            description = "Destroy ground forces"
            args = astxt(`In ${cmd.Args.Region}, for ${cmd.Args.Coalition}: ${cmd.Args.Amount}`)
            break
        case "MoveGroundForces":
            description = "Move ground forces"
            args = astxt(`From ${cmd.Args.Start} into ${cmd.Args.Destination}, for ${cmd.Args.Coalition}: ${cmd.Args.Amount}`)
            break
        case "RemovePlane":
            description = "Remove plane"
            args = astxt(`From ${cmd.Args.Airfield}, plane ${cmd.Args.Plane}: ${cmd.Args.Amount}`)
            break
        case "AddPlane":
            description = "Add plane"
            args = astxt(`From ${cmd.Args.Airfield}, plane ${cmd.Args.Plane}: ${cmd.Args.Amount}`)
            break
        case "RepairBuildingPart":
            description = "Repair building"
            args = astxt(`At ${cmd.Args.BuildingAt.Position.X}, ${cmd.Args.BuildingAt.Position.Y}, part ${cmd.Args.Part}: ${cmd.Args.Repair}`)
            break
        case "SetRegionOwner":
            description = "Take over region"
            args = astxt(`${cmd.Args.Region} by ${cmd.Args.Coalition}`)
            break
        case "AdvanceTime":
            description = "Advance time"
            args = astxt(`Hours: ${cmd.Args.Hours}`)
            break
        default:
            description = cmd.Verb
            args = document.createTextNode("")
    }
    const div = document.createElement("div")
    const p = document.createElement("p")
    const txt = document.createTextNode(description)
    p.appendChild(txt)
    div.appendChild(p)
    div.appendChild(args)
    return div
}

interface UpdatedStorageValues {
    BuildingAt: OrientedPosition
    Amount: number
}

interface UpdatedStorageResult {
    ChangeDescription: "UpdatedStorageValue"
    Values: UpdatedStorageValues
}

interface UpdatedPlanesValues {
    Airfield: string
    Planes: Dict<number>
}

interface UpdatedPlanesResult {
    ChangeDescription: "UpdatedPlanesAtAirfield"
    Values: UpdatedPlanesValues
}

interface UpdatedGroundForcesValues {
    Region: string
    Coalition: Coalition
    Forces: number
}

interface UpdatedGroundForcesResult {
    ChangeDescription: "UpdatedGroundForces"
    Values: UpdatedGroundForcesValues
}

interface RegionOwnerSetValues {
    Region: string
    Coalition: Coalition
}

interface RegionOwnerSetResult {
    ChangeDescription: "RegionOwnerSet"
    Values: RegionOwnerSetValues
}

interface TimeSetValues {
    DateTime: DateTime
}

interface TimeSetResult {
    ChangeDescription: "TimeSet"
    Values: TimeSetValues
}

interface OtherResult {
    ChangeDescription: string
    Values: any
}

type Result = UpdatedStorageResult | UpdatedPlanesResult | UpdatedGroundForcesResult | RegionOwnerSetResult | TimeSetResult | OtherResult

function resultToHtml(result: Result) {
    const li = document.createElement("li")
    let txt = undefined
    let args = undefined
    function astxt(s: string) { return document.createTextNode(s) }
    switch (result.ChangeDescription) {
        case "RegionOwnerSet":
            txt = "Region owner set"
            args = astxt(`${result.Values.Region} now owned by ${result.Values.Coalition}`)
            break
        case "TimeSet":
            txt = "Time has been set"
            args = astxt(`Time: ${dateToStr(result.Values.DateTime)}`)
            break
        case "UpdatedGroundForces":
            txt = "Ground forces amount changed"
            args = astxt(`${result.Values.Coalition} in ${result.Values.Region} now has ${result.Values.Forces}`)
            break
        case "UpdatedPlanesAtAirfield":
            txt = "Planes at airfield changed"
            args = document.createElement("li")
            for (const key of keysOf(result.Values.Planes)) {
                const ul = document.createElement("ul")
                ul.appendChild(astxt(`${key}: ${result.Values.Planes[key]}`))
                args.appendChild(ul)
            }
            break
        case "UpdatedStorageValue":
            txt = "Storage capacity updated"
            args = astxt(`At ${result.Values.BuildingAt.Position.X}, ${result.Values.BuildingAt.Position.Y}: ${result.Values.Amount}`)
            break
        default:
            txt = result.ChangeDescription
            args = astxt("")
    }
    const p = document.createElement("p")
    p.appendChild(document.createTextNode(txt))
    li.appendChild(p)
    li.appendChild(args)
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

function sum(xs: number[]) {
    return xs.reduce((x, y) => x + y, 0)
}

interface ValueRange {
    min: number
    max: number
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
const btnRun = document.getElementById("btn-run")
const btnStep = document.getElementById("btn-step")

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
                                // Show detailed properties for the results of the select event
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
    const states = new Array<WarState>()
    const axisNumRegions: number[] = []
    const alliesNumRegions: number[] = []
    const axisRegionCapacity: number[] = []
    const alliesRegionCapacity: number[] = []
    const axisAirfieldCapacity: number[] = []
    const alliesAirfieldCapacity: number[] = []
    const axisSupplies: number[] = []
    const alliesSupplies: number[] = []
    const axisGroundForces: number[] = []
    const alliesGroundForces: number[] = []
    const axisPlanes: number[] = []
    const alliesPlanes: number[] = []
    const axisFlightLosses: number[] = []
    const alliesFlightLosses: number[] = []
    const axisParkedLosses: number[] = []
    const alliesParkedLosses: number[] = []
    const timeline: string[] = []
    for (let i = 0; i < dates.length; ++i) {
        const date = dateToStr(dates[i])
        const response = await fetch(config.campaignServerUrl + `/query/past/${i}`)
        const responseSim = await fetch(config.campaignServerUrl + `/query/simulation/${i}`)
        if (response.ok && responseSim.ok) {
            const data: WarState = await response.json()
            const simData:SimulationStep[] = await responseSim.json()
            states.push(data)
            function totalGroundForces(coalition: Coalition) {
                const total = sum(data.GroundForces.filter(value => value.Coalition == coalition).map(value => value.Forces))
                return total
            }
            function regionsOf(coalition: Coalition) {
                return world.Regions.filter(reg => data.RegionOwner[reg.Id] == coalition)
            }
            function suppliesIn(regions: Region[]) {
                return sum(regions.map(reg => data.SupplyStatus[reg.Id] ?? 0))
            }
            function capacityInRegion(region: Region): number {
                const res =
                    region.Buildings
                    .map(b =>
                        {
                            const capacity = world.BuildingProperties[b.PropertiesId].Capacity
                            const level = (data.BuildingHealth.find(value => value.Position == b.Position)?.FunctionalityLevel ?? 1.0)
                            return level * capacity
                        })
                return sum(res)
            }
            function capacityInAirfield(airfield: Airfield): number {
                const res =
                    airfield.Buildings
                    .map(b =>
                        {
                            const capacity = world.BuildingProperties[b.PropertiesId].Capacity
                            const level = (data.BuildingHealth.find(value => value.Position == b.Position)?.FunctionalityLevel ?? 1.0)
                            return level * capacity
                        })
                return sum(res)
            }
            function airfieldsOf(coalition: Coalition) {
                return world.Airfields.filter(af => data.RegionOwner[af.Region] == coalition)
            }
            function planesAtAirfields(airfields: Airfield[]) {
                const planes = sum(airfields.flatMap(af => valuesOf(data.Planes[af.Id]) ?? 0))
                return planes
            }
            function planeLosses(airfields: Airfield[]) {
                let diff = 0
                let strafed = 0
                function isInAirfields(airfieldName: string) {
                    return airfields.find(af => af.Id == airfieldName) != undefined
                }
                for (const step of simData) {
                    for (const cmd of step.Command) {
                        if (cmd.Verb == "AddPlane" && isInAirfields(cmd.Args.Airfield)) {
                            if (step.Description.indexOf("landed") >= 0) {
                                diff += cmd.Args.Amount
                            }
                        }
                        else if (cmd.Verb == "RemovePlane" && isInAirfields(cmd.Args.Airfield)) {
                            if (step.Description.indexOf("take off") >= 0) {
                                diff -= cmd.Args.Amount
                            }
                            else if (step.Description.indexOf("arked plane") >= 0) {
                                strafed += cmd.Args.Amount
                            }
                            else {
                                console.debug(`Unhandled plane removal: ${step.Description}`)
                            }
                        }
                    }
                }
                return {
                    strafed: strafed,
                    shot: diff < 0 ? -diff : 0
                }
            }
            const axisRegions = regionsOf("Axis")
            const alliesRegions = regionsOf("Allies")
            const axisAirfields = airfieldsOf("Axis")
            const alliesAirfields = airfieldsOf("Allies")
            const axisPlaneLosses = planeLosses(axisAirfields)
            const alliesPlaneLosses = planeLosses(alliesAirfields)
            axisNumRegions.push(axisRegions.length)
            alliesNumRegions.push(alliesRegions.length)
            axisSupplies.push(suppliesIn(axisRegions))
            alliesSupplies.push(suppliesIn(alliesRegions))
            axisGroundForces.push(totalGroundForces("Axis"))
            alliesGroundForces.push(totalGroundForces("Allies"))
            axisPlanes.push(planesAtAirfields(axisAirfields))
            alliesPlanes.push(planesAtAirfields(alliesAirfields))
            axisRegionCapacity.push(sum(axisRegions.map(capacityInRegion)))
            alliesRegionCapacity.push(sum(alliesRegions.map(capacityInRegion)))
            axisAirfieldCapacity.push(sum(axisAirfields.map(capacityInAirfield)))
            alliesAirfieldCapacity.push(sum(alliesAirfields.map(capacityInAirfield)))
            axisFlightLosses.push(axisPlaneLosses.shot)
            alliesFlightLosses.push(alliesPlaneLosses.shot)
            axisParkedLosses.push(axisPlaneLosses.strafed)
            alliesParkedLosses.push(alliesPlaneLosses.strafed)
            timeline.push(date)
        }
    }
    function mkScale(k: number) {
        return (x: number) => k * x
    }
    const plotData : Partial<Plotly.PlotData>[] = [
        {
            x: [timeline[0], timeline[timeline.length - 1]],
            y: [0, 0],
            name: "0 baseline",
            mode: "lines",
            line: {
                color: "black"
            }
        },
        {
            x: timeline,
            y: axisNumRegions.map(mkScale(100)),
            name: "regions (Axis) x100"
        },
        {
            x: timeline,
            y: alliesNumRegions.map(mkScale(100)),
            name: "regions (Allies) x100"
        },
        {
            x: timeline,
            y: axisSupplies.map(mkScale(1e-3)),
            name: "supplies (Axis) /1k"
        },
        {
            x: timeline,
            y: alliesSupplies.map(mkScale(1e-3)),
            name: "supplies (Allies) /1k"
        },
        {
            x: timeline,
            y: axisGroundForces.map(mkScale(0.1)),
            name: "ground forces (Axis) /10"
        },
        {
            x: timeline,
            y: alliesGroundForces.map(mkScale(0.1)),
            name: "ground forces (Allies) /10"
        },
        {
            x: timeline,
            y: axisPlanes,
            name: "planes (Axis)"
        },
        {
            x: timeline,
            y: alliesPlanes,
            name: "planes (Allies)"
        },
        {
            x: timeline,
            y: axisRegionCapacity.map(mkScale(1.0e-4)),
            name: "city storage (Axis) /10k"
        },
        {
            x: timeline,
            y: alliesRegionCapacity.map(mkScale(1.0e-4)),
            name: "city storage (Allies) /10k"
        },
        {
            x: timeline,
            y: axisAirfieldCapacity.map(mkScale(1.0e-3)),
            name: "airfield storage (Axis) /1k"
        },
        {
            x: timeline,
            y: alliesAirfieldCapacity.map(mkScale(1.0e-3)),
            name: "airfield storage (Allies) /1k"
        },
        {
            x: timeline,
            y: axisFlightLosses,
            name: "inflight losses (Axis)"
        },
        {
            x: timeline,
            y: alliesFlightLosses,
            name: "inflight losses (Allies)"
        },
        {
            x: timeline,
            y: axisParkedLosses,
            name: "parked planes losses (Axis)"
        },
        {
            x: timeline,
            y: alliesParkedLosses,
            name: "parked planes losses (Allies)"
        }
    ]
    const graph = Plotly.newPlot(graphDiv, plotData,
        {
            margin: { t: 0 },
            showlegend: true,
            legend: {
                y: 0.5
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
        await buildGraph(world, dates)
    }

    const mapBounds = getMapBounds(world.Map)
    if (mapBounds != undefined)
        map.fitBounds(mapBounds)
})

// Debug: show leaflet coordinates when clicking on the map
map.on("click", async(args: L.LeafletMouseEvent) => {
    console.info(args.latlng)
})

btnStep?.addEventListener("click", async () => {
    const response = await fetch(config.campaignServerUrl + "/control/advance", { method: "PUT" })
    console.debug(response)
})

map.fitWorld()