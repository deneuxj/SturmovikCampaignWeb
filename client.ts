/// <reference path="node_modules/@types/leaflet/index.d.ts" />

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

let config = {
    campaignServerUrl: "http://127.0.0.1:8080",
}

const bounds = {
    rheinland: new L.LatLngBounds([-90, -180], [60.27, 15.74])
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

var mapTiles = new L.TileLayer("https://tiles.il2missionplanner.com/rheinland/{z}/{x}/{y}.png",
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
                console.info("New transform defined")
            }
            else {
                console.error(`Bounds for map '${mapName}' are unknown`)
            }
            for (let i = 0; i < world.Regions.length; i++) {
                const region = world.Regions[i];
                console.info(`Add region ${region.Id}`)
                let m = L.marker(transform(region.Position), {
                    title: region.Id,
                    alt: `Region ${region.Id}`
                }).addTo(map)
                console.info(` at ${m.getLatLng()}`)
            }
        }
    }
    else {
        console.info("viewreset: Response status was not OK")
    }
})

map.on("click", async(args : L.LeafletMouseEvent) => {
    console.info(args.latlng)
})

map.fitWorld()