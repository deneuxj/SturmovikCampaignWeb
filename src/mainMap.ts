/// <reference types="leaflet" />
/// <reference types="bootstrap" />
/// <reference types="plotly.js" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />
/// <reference path="./dataSource.ts" />
/// <reference path="./sampleData.ts" />
/// <reference path="./config.ts" />
/// <reference path="./common.ts" />

// Signature of functions to draw polylines using the game's coordinate system
type DrawPolyLineFun = (vs: Vector2[], color: string) => void

// -------- Implementation

//
// Classes
//

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

class EasyWarState {
    world: World
    state: WarState
    buildingStatus: Dict<BuildingStatus>
    regions: Dict<Region>
    groundForces: Dict<number>
    airfields: Dict<Airfield>

    constructor(world: World, state: WarState) {
        this.world = world
        this.state = state
        this.buildingStatus = {}
        for (const status of state.BuildingHealth) {
            const key = JSON.stringify(status.Position)
            this.buildingStatus[key] = status
        }
        this.regions = {}
        for (const r of world.Regions) {
            this.regions[r.Id] = r
        }
        this.groundForces = {}
        for (const gf of state.GroundForces) {
            const key = JSON.stringify({
                region: gf.Region,
                coalition: gf.Coalition
            })
            this.groundForces[key] = gf.Forces
        }
        this.airfields = {}
        for (const af of world.Airfields) {
            this.airfields[af.Id] = af
        }
    }

    public capacityInBuildings(buildings: BuildingInstance[]) {
        const res =
            buildings
            .map(b =>
                {
                    const capacity = this.world.BuildingProperties[b.PropertiesId].Capacity ?? 0
                    const level = this.buildingStatus[JSON.stringify(b.Position)]?.FunctionalityLevel ?? 1.0
                    return level * capacity
                })
        return sum(res ?? [])
    }

    public capacityInRegion(regionId: string) {
        return this.capacityInBuildings(this.regions[regionId]?.Buildings ?? [])
    }

    public capacityAtAirfield(airfieldId: string) {
        return this.capacityInBuildings(this.airfields[airfieldId]?.Buildings ?? [])
    }

    public groundForcesInRegion(regionId: string, coalition: Coalition) {
        const key = JSON.stringify({
            region: regionId,
            coalition: coalition
        })
        return this.groundForces[key] ?? 0
    }
}

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

// Bounds of each map (regardless of season variants) in leaflet's coordinate system
const bounds = {
    rheinland: new L.LatLngBounds([-90, -180], [-10.87, -82.13]),
    stalingrad: new L.LatLngBounds([-90, -180], [25.471, 0]),
    kuban: new L.LatLngBounds([-90, -180], [-19.75, -78.52]),
}

// Get the bounds (leaflet's coordinate system) of a specific map and season
function getMapBounds(mapName: string) {
    switch(mapName) {
        case "rheinland-summer":
        case "rheinland-winter":
        case "rheinland-autumn":
        case "rheinland-spring":
            return bounds.rheinland;
        case "stalingrad-summer-1942":
        case "stalingrad-autumn-1942":
        case "stalingrad-winter-1942":
            return bounds.stalingrad;
        case "kuban-autumn":
        case "kuban-spring":
        case "kuban-summer":
            return bounds.kuban;
        default:
            return undefined;
    }
}

// The leaflet map
let map = new L.Map("mapid", {
    crs: L.CRS.EPSG4326
})

// The layers of the data of the day on the map
let daysPolys: L.Polyline[] = []

// Various HTML elements to hook on
const dayslist = document.getElementById("list-days")
const dayEvents = document.getElementById("list-events")
const propertiesCell = document.getElementById("event-details")
const graphDiv = document.getElementById("visualization")

function plannerIcon(filename: string, iconSize: [number, number]) {
    return L.icon({
        iconUrl: config.iconUrl + filename,
        iconSize: iconSize,
        iconAnchor: [iconSize[0]/2, iconSize[1]/2],
        popupAnchor: [1 + iconSize[0]/2, 1 + iconSize[1]/2]
    })
}

function plannerIconRE(color: "red" | "black" | "blue", basename: string) {
    return plannerIcon(`${color}-re-${basename}.png`, [35, 35])
}

// Icons, also using il2missionplanner.com
const icons = {
    city: {
        red: plannerIconRE("red", "point"),
        blue: plannerIconRE("blue", "point"),
        black: plannerIconRE("blue", "point")
    },
    airfield: {
        red: plannerIconRE("red", "af"),
        blue: plannerIconRE("blue", "af"),
        black: plannerIconRE("black", "af")
    }
}

// Set to a proper transformation from game world coordinates to Leaflet coordinates upon reception of world data
let transform = (v : Vector2): L.LatLng => new L.LatLng(v.X, v.Y);

let regionMarkers: Dict<L.Marker> = {}

let airfieldMarkers: Dict<L.Marker> = {}

// Get world data: Static information about regions, airfields...
async function getWorldData() {
    const world = await dataSource.getWorld()
    if (world == null)
        return null
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
    regionMarkers = {}
    let regions: Dict<Region> = {}
    for (let i = 0; i < world.Regions.length; i++) {
        const region = world.Regions[i];
        regions[region.Id] = region
        let m = L.marker(transform(region.Position), {
            title: region.Id,
            alt: `Region ${region.Id}`,
            icon: region.InitialOwner == "Allies" ? icons.city.red : icons.city.blue
        }).addTo(map)
        regionMarkers[region.Id] = m
    }
    airfieldMarkers = {}
    for (const airfield of world.Airfields) {
        let owner = regions[airfield.Region]?.InitialOwner
        let m = L.marker(transform(airfield.Position), {
            title: airfield.Id,
            alt: `Airfield ${airfield.Id}`,
            icon: owner == "Allies" ? icons.airfield.red : icons.airfield.blue
        }).addTo(map)
        airfieldMarkers[airfield.Id] = m
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
        const dayData = await dataSource.getState(idx)
        // Draw region borders
        if (dayData != null) {
            const easy = new EasyWarState(world, dayData)
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
            // Set popups for regions: supplies, storage and troops
            for (const region of world.Regions) {
                const supplies = Math.round(dayData.SupplyStatus[region.Id] ?? 0)
                const storage = Math.round(easy.capacityInRegion(region.Id))
                let items =
                [
                    `logistics: ${supplies} m^3/h`,
                    `storage: ${storage} m^3`,
                ]
                const owner = dayData.RegionOwner[region.Id]
                if (owner != undefined) {
                    const defenders = easy.groundForcesInRegion(region.Id, owner)
                    const attackers = easy.groundForcesInRegion(region.Id, otherCoalition(owner))
                    if (defenders > 0) items = items.concat([`defenders: ${Math.round(defenders)}`])
                    if (attackers > 0) items = items.concat([`attackers: ${Math.round(attackers)}`])
                }
                regionMarkers[region.Id]?.unbindPopup()
                regionMarkers[region.Id]?.bindPopup(
                    mkUnumberedList(items)
                )
            }
            // Set popups for airfields: storage and planes
            for (const airfield of world.Airfields) {
                const planes = Math.trunc(sum(valuesOf(dayData.Planes[airfield.Id])) ?? 0)
                const storage = Math.round(easy.capacityAtAirfield(airfield.Id))
                airfieldMarkers[airfield.Id]?.unbindPopup().bindPopup(
                    mkUnumberedList(
                        [
                            `storage: ${storage} m^3`,
                            `planes: ${planes}`
                        ]
                    )
                )
            }
        }
        // Populate list of events
        if (dayEvents != null) {
            removeAllChildren(dayEvents)
            const dayActions = await dataSource.getSimulationSteps(idx)
            if (dayActions != null) {
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
    const dates = await dataSource.getDates()
    if (dates == null)
        return null
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
        const data = await dataSource.getState(i)
        if (data == null)
            continue
        const simData = await dataSource.getSimulationSteps(i)
        if (simData == null)
            continue
        states.push(data)
        function totalGroundForces(coalition: Coalition) {
            if (data == null)
                return 0
            const total = sum(data.GroundForces.filter(value => value.Coalition == coalition).map(value => value.Forces))
            return total
        }
        function regionsOf(coalition: Coalition) {
            if (data == null)
                return []
            return world.Regions.filter(reg => data.RegionOwner[reg.Id] == coalition)
        }
        function suppliesIn(regions: Region[]) {
            if (data == null)
                return 0
            return sum(regions.map(reg => data.SupplyStatus[reg.Id] ?? 0))
        }
        function capacityInRegion(region: Region): number {
            if (data == null)
                return 0
            const res =
                region.Buildings
                .map(b =>
                    {
                        const capacity = world.BuildingProperties[b.PropertiesId].Capacity ?? 0
                        const level = (data.BuildingHealth.find(value => posEq(value.Position, b.Position))?.FunctionalityLevel ?? 1.0)
                        return level * capacity
                    })
            return sum(res)
        }
        function capacityInAirfield(airfield: Airfield): number {
            if (data == null)
                return 0
            const res =
                airfield.Buildings
                .map(b =>
                    {
                        const capacity = world.BuildingProperties[b.PropertiesId].Capacity ?? 0
                        const level = (data.BuildingHealth.find(value => posEq(value.Position, b.Position))?.FunctionalityLevel ?? 1.0)
                        return level * capacity
                    })
            return sum(res)
        }
        function airfieldsOf(coalition: Coalition) {
            if (data == null)
                return []
            return world.Airfields.filter(af => data.RegionOwner[af.Region] == coalition)
        }
        function planesAtAirfields(airfields: Airfield[]) {
            if (data == null)
                return 0
            const planes = sum(airfields.flatMap(af => valuesOf(data.Planes[af.Id]) ?? 0))
            return planes
        }
        function planeLosses(airfields: Airfield[]) {
            if (data == null)
                return { strafed: 0, shot: 0 }
            let diff = 0
            let strafed = 0
            function isInAirfields(airfieldName: string) {
                return airfields.find(af => af.Id == airfieldName) != undefined
            }
            for (const step of simData ?? []) {
                for (const cmd of step.Command) {
                    if (cmd.Verb == "AddPlane" && isInAirfields(cmd.Args.Airfield)) {
                        if (step.Description.indexOf("landed") >= 0 || step.Description.indexOf("transfered") >= 0) {
                            diff += cmd.Args.Amount
                        }
                        else {
                            console.debug(`Unhandled plane addition: ${step.Description}`)
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
            console.debug(`strafed: ${strafed}, diff: ${diff}`)
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

    // The tiles of the map, using il2missionplanner.com
    const mapTiles = new L.TileLayer(config.tilesUrlTemplate(world.Map),
        {
            tms: true,
            noWrap: true,
            minNativeZoom: 1,
            maxNativeZoom: 6,
            maxZoom: 7,
            zoomOffset: 0,
            attribution: "il2missionplanner.com"
        })
    mapTiles.addTo(map)

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

map.fitWorld()