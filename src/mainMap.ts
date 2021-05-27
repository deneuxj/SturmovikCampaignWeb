/// <reference types="leaflet" />
/// <reference types="bootstrap" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />
/// <reference path="./dataSource.ts" />
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
    bridgesStatus: Dict<BuildingStatus>
    regions: Dict<Region>
    groundForces: Dict<number>
    airfields: Dict<Airfield>

    constructor(world: World, state: WarState) {
        this.world = world
        this.state = state
        this.bridgesStatus = {}
        for (const status of state.BridgeHealth) {
            const key = JSON.stringify(status.Position)
            this.bridgesStatus[key] = status
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

// Various HTML elements to hook on
const dayslist = document.getElementById("list-days")
const dayEvents = document.getElementById("list-events")
const propertiesCell = document.getElementById("event-details")

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
    },
    truck: plannerIconRE("blue", "motorcade"),
    bridge:
        L.icon({
            iconUrl: config.campaignServerUrl + "/img/bridge.png",
            iconSize: [32, 32],
            iconAnchor: [16, 16],
            popupAnchor: [17, 17]
        })
}

// Set to a proper transformation from game world coordinates to Leaflet coordinates upon reception of world data
let transform = (v : Vector2): L.LatLng => new L.LatLng(v.X, v.Y);

// The layers of region boundaries on the map
let daysPolys: L.Polyline[] = []

// The layers of transport links on the map
let transportPolys: L.Polyline[] = []

function drawPolyLine(vs: Vector2[], polys: L.Polyline[], options?: null | { color?: string, isLoop?: boolean, addToMap?: boolean }) {
    const ps = vs.map(transform)
    if (options?.isLoop)
        ps.push(ps[0])
    const poly = L.polyline(ps, { color: options?.color ?? "black" })
    polys.push(poly)
    if (options?.addToMap)
        poly.addTo(map)
}

let regionMarkers: Dict<L.Marker> = {}

function removeMarkers(markers : Dict<L.Layer>) {
    for (const [key, marker] of Object.entries(markers)) {
        if (marker == undefined)
            continue
        map.removeLayer(marker)
    }
}

function restoreMarkers(markers : Dict<L.Layer>) {
    for (const [key, marker] of Object.entries(markers)) {
        if (marker == undefined)
            continue
        marker.addTo(map)
    }
}

function removeMarkersArray(markers : L.Layer[]) {
    for (const marker of markers) {
        map.removeLayer(marker)
    }
}

function restoreMarkersArray(markers: L.Layer[]) {
    for (const marker of markers) {
        marker.addTo(map)
    }
}

function setRegionMarkers(world: World, ownerOf: (region: string) => string | null) {
    removeMarkers(regionMarkers)
    regionMarkers = {}
    for (let i = 0; i < world.Regions.length; i++) {
        const region = world.Regions[i]
        const owner = ownerOf(region.Id)
        if (owner == null)
            continue
        let m = L.marker(transform(region.Position), {
            title: region.Id,
            alt: `Region ${region.Id}`,
            icon: ownerOf(region.Id) == "Allies" ? icons.city.red : icons.city.blue
        })
        regionMarkers[region.Id] = m
    }
}

let airfieldMarkers: Dict<L.Marker> = {}

function setAirfieldMarkers(world: World, ownerOf: (region: string) => string | null) {
    removeMarkers(airfieldMarkers)
    airfieldMarkers = {}
    for (const airfield of world.Airfields) {
        let owner = ownerOf(airfield.Region)
        if (owner == null)
            continue
        let m = L.marker(transform(airfield.Position), {
            title: airfield.Id,
            alt: `Airfield ${airfield.Id}`,
            icon: owner == "Allies" ? icons.airfield.red : icons.airfield.blue
        })
        airfieldMarkers[airfield.Id] = m
    }
}

let truckMarkers: L.Marker[] = []
async function setTruckMarkers(world: World, idx: number) {
    removeMarkersArray(truckMarkers)
    truckMarkers = []
    transportPolys = []
    const regions : Dict<Region> = {}
    for (const regionA of world.Regions) {        
        for (const regionBName of regionA.Neighbours) {
            const regionB = regions[regionBName]
            if (regionB ==  undefined)
                continue
            const posB = regionB.Position
            const posA = regionA.Position
            const capacity = await dataSource.getTransportCapacity(idx, regionA.Id, regionB.Id)
            if (capacity <= 0)
                continue
            drawPolyLine([posA, posB], transportPolys, { color: "black" })
            const middle = { X: (posA.X + posB.X) / 2.0, Y: (posA.Y + posB.Y) / 2.0 }
            const m = L.marker(transform(middle), {
                title: capacity.toFixed(),
                icon: icons.truck,
                opacity: 0.5
            })
            truckMarkers.push(m)
        }
        regions[regionA.Id] = regionA
    }
}

let bridgeMarkers: L.Marker[] = []
async function setBridgeMarkers(world: World, state: WarState) {
    removeMarkersArray(bridgeMarkers)
    bridgeMarkers = []
    for (const health of state.BridgeHealth) {
        const m = L.marker(transform(health.Position.Position), {
            title: `${(100 * health.FunctionalityLevel).toFixed()}% operational`,
            icon: icons.bridge,
            opacity: 0.5
        })
        bridgeMarkers.push(m)
    }
}

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
    function ownerOf(region: string) {
        if (world == null)
            return null
        for (const r of world.Regions) {
            if (r.Id == region)
                return r.InitialOwner
        }
        return null
    }
    setRegionMarkers(world, ownerOf)
    setAirfieldMarkers(world, ownerOf)
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
        if (dayData != null) {
            const easy = new EasyWarState(world, dayData)

            // Region borders
            const regionsWithOwners = new BorderRenderer((vs: Vector2[], color: string) => drawPolyLine(vs, daysPolys, { color: color, isLoop: true, addToMap:true }), world, dayData)
            for (const polyline of daysPolys) {
                map.removeLayer(polyline)
            }
            daysPolys = []
            regionsWithOwners.drawBorders()

            // Region and airfield icons
            function ownerOf(region: string) {
                if (easy == null)
                    return null
                const owner = easy.state.RegionOwner[region]
                if (owner == undefined)
                    return null
                return owner
            }
            setRegionMarkers(world, ownerOf)
            setAirfieldMarkers(world, ownerOf)
            setTruckMarkers(world, idx)
            setBridgeMarkers(world, dayData)

            // Set popups for regions: supplies, storage and troops
            for (const region of world.Regions) {
                const supplies = Math.round(await dataSource.getRegionSupplies(idx, region.Id))
                const storage = Math.round(await dataSource.getRegionCapacity(idx, region.Id))
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
                const storage = Math.round(await dataSource.getAirfieldCapacity(idx, airfield.Id))
                airfieldMarkers[airfield.Id]?.unbindPopup().bindPopup(
                    mkUnumberedList(
                        [
                            `storage: ${storage} m^3`,
                            `planes: ${planes}`
                        ]
                    )
                )
            }

            // Set transport capacity between regions

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

    await getDays(world)

    const mapBounds = getMapBounds(world.Map)
    if (mapBounds != undefined)
        map.fitBounds(mapBounds)
})

// Debug: show leaflet coordinates when clicking on the map
map.on("click", async(args: L.LeafletMouseEvent) => {
    console.info(args.latlng)
})

// Hide or show layers depending on zoom
map.on("zoomend", (args: L.LeafletEvent) => {
    const zoom = map.getZoom()
    removeMarkersArray(truckMarkers)
    removeMarkers(regionMarkers)
    removeMarkers(airfieldMarkers)
    removeMarkersArray(transportPolys)
    removeMarkersArray(bridgeMarkers)
    if (zoom >= 4) {
        restoreMarkers(regionMarkers)
        restoreMarkers(airfieldMarkers)
    }
    if (zoom >= 5) {
        restoreMarkersArray(transportPolys)
        restoreMarkersArray(truckMarkers)
        restoreMarkersArray(bridgeMarkers)
    }
})

map.fitWorld()