/// <reference types="bootstrap" />
/// <reference types="plotly.js" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />
/// <reference path="./dataSource.ts" />
/// <reference path="./config.ts" />
/// <reference path="./common.ts" />

// Various HTML elements to hook on
const graphDiv = document.getElementById("visualization")

interface SinglePlotData {
    values: [string, number][]
    scaling: number
    label: string
    side: Coalition
}

function toPlotly(plot : SinglePlotData) : Partial<Plotly.PlotData> {
    return {
        x: plot.values.map(v => v[0]),
        y: plot.values.map(v => v[1] / plot.scaling),
        name: plot.label
    }
}

async function asyncMap<U, V>(items: U[], func: ((x: U) => Promise<V>)) {
    var xs = []
    for (const item of items) {
        const x = await func(item)
        xs.push(x)
    }
    return xs
}

function addToNumRegionsPlot(plot : SinglePlotData, world: World, state : WarState, side : Coalition) : void {
    let ownerOf = state.RegionOwner
    let regions = world.Regions.filter(region => ownerOf[region.Id] == side)
    let numRegions = regions.length
    plot.values.push([dateToStr(state.Date), numRegions])
}

async function capacityInRegion(campaignStep : number, region: Region) {
    return await dataSource.getRegionCapacity(campaignStep, region.Id)
}

async function addToRegionCapacityPlot(plot : SinglePlotData, campaignStep : number, world: World, state : WarState, side : Coalition) : Promise<void> {
    let ownerOf = state.RegionOwner
    let regions = world.Regions.filter(region => ownerOf[region.Id] == side)
    let capacities = await asyncMap(regions, region => capacityInRegion(campaignStep, region) ?? 0);
    let capacity = capacities.reduce((a, b) => a + b, 0)
    plot.values.push([dateToStr(state.Date), capacity])
}

async function capacityInAirfield(campaignStep : number, airfield: Airfield) {
    return await dataSource.getAirfieldCapacity(campaignStep, airfield.Id)
}

async function addToAirfieldCapacityPlot(plot : SinglePlotData, campaignStep : number, world: World, state : WarState, side : Coalition) : Promise<void> {
    let ownerOf = state.RegionOwner
    let airfields = world.Airfields.filter(airfield => ownerOf[airfield.Region] == side)
    let capacities = await asyncMap(airfields, airfield => capacityInAirfield(campaignStep, airfield) ?? 0);
    let capacity = capacities.reduce((a, b) => a + b, 0)
    plot.values.push([dateToStr(state.Date), capacity])
}

function totalGroundForces(state : WarState, side : Coalition) {
    let total = sum(state.GroundForces.filter(value => value.Coalition == side).map(value => value.Forces))
    return total
}

function addToGroundForcesPlot(plot : SinglePlotData, world: World, state : WarState, side : Coalition) {
    let total = totalGroundForces(state, side)
    plot.values.push([dateToStr(state.Date), total])
}

function airfieldsOf(world : World, data : WarState, coalition: Coalition) {
    return world.Airfields.filter(af => data.RegionOwner[af.Region] == coalition)
}

function planesAtAirfields(airfields: Airfield[], data : WarState) {
    const planes = sum(airfields.flatMap(af => valuesOf(data.Planes[af.Id]) ?? 0))
    return planes
}

function totalPlanes(world : World, state : WarState, side : Coalition) {
    let airfields = airfieldsOf(world, state, side)
    let planes = planesAtAirfields(airfields, state)
    return planes
}

function addToPlanesPlot(plot : SinglePlotData, world: World, state : WarState, side : Coalition) {
    let total = totalPlanes(world, state, side)
    plot.values.push([dateToStr(state.Date), total])
}

async function buildAllPlots(world : World) : Promise<SinglePlotData[] | null>{
    const dates = await dataSource.getDates()
    if (dates == null)
        return null;

    let axisAirfieldCapacityPlot : SinglePlotData = {values: [], scaling: 1000, label: "airfield storage (Axis) /1k", side: "Axis"}
    let alliesAirfieldCapacityPlot : SinglePlotData = {values: [], scaling: 1000, label: "airfield storage (Allies) /1k", side: "Allies"}
    let axisRegionCapacityPlot : SinglePlotData = {values: [], scaling: 10000, label: "city storage (Axis) /10k", side: "Axis"}
    let alliesRegionCapacityPlot : SinglePlotData = {values: [], scaling: 10000, label: "city storage (Allies) /10k", side: "Allies"}
    let axisNumRegionsPlot : SinglePlotData = {values: [], scaling: 0.01, label: "regions (Axis) x100", side: "Axis"}
    let alliesNumRegionsPlot : SinglePlotData = {values: [], scaling: 0.01, label: "regions (Allies) x100", side: "Allies"}
    let axisGroundForcesPlot : SinglePlotData = {values: [], scaling: 10, label: "ground forces (Axis) /10", side: "Axis"}
    let alliesGroundForcesPlot : SinglePlotData = {values: [], scaling: 10, label: "ground forces (Allies) /10", side: "Allies"}
    let axisPlanesPlot : SinglePlotData = {values: [], scaling: 1, label: "planes (Axis)", side: "Axis"}
    let alliesPlanesPlot : SinglePlotData = {values: [], scaling: 1, label: "planes (Allies)", side: "Allies"}

    for (let i = 0; i < dates.length; ++i) {
        const data = await dataSource.getState(i)
        if (data == null)
            continue
        const awaitables = [
            addToAirfieldCapacityPlot(axisAirfieldCapacityPlot, i, world, data, "Axis"),
            addToAirfieldCapacityPlot(alliesAirfieldCapacityPlot, i, world, data, "Allies"),
            addToRegionCapacityPlot(axisRegionCapacityPlot, i, world, data, "Axis"),
            addToRegionCapacityPlot(alliesRegionCapacityPlot, i, world, data, "Allies"),
        ]
        addToGroundForcesPlot(axisGroundForcesPlot, world, data, "Axis")
        addToGroundForcesPlot(alliesGroundForcesPlot, world, data, "Allies")
        addToNumRegionsPlot(axisNumRegionsPlot, world, data, "Axis")
        addToNumRegionsPlot(alliesNumRegionsPlot, world, data, "Allies")
        addToPlanesPlot(axisPlanesPlot, world, data, "Axis")
        addToPlanesPlot(alliesPlanesPlot, world, data, "Allies")
        await Promise.all(awaitables)
    }
    const ret =
        [axisAirfieldCapacityPlot, alliesAirfieldCapacityPlot, axisRegionCapacityPlot, alliesRegionCapacityPlot, axisNumRegionsPlot, alliesNumRegionsPlot, axisGroundForcesPlot, alliesGroundForcesPlot, axisPlanesPlot, alliesPlanesPlot];
    return ret;
}

async function buildGraph(world : World) {
    if (graphDiv == null)
        return
    const dates = await dataSource.getDates()
    if (dates == null || world == null)
        return

    const plots = await buildAllPlots(world)
    if (plots == null)
        return
    const plotlyData = plots.map(toPlotly)
    plotlyData.push({
            x: [dateToStr(dates[0]), dateToStr(dates[dates.length - 1])],
            y: [0, 0],
            name: "0 baseline",
            mode: "lines",
            line: {
                color: "black"
            }
        })

    Plotly.newPlot(graphDiv, plotlyData,
    {
        margin: { t: 0 },
        showlegend: true,
        legend: {
            y: 0.5
        }
    })
}

async function getWorldAndBuildGraph() {
    const world = await dataSource.getWorld()
    if (world == null)
        return
    await buildGraph(world)
}

window.addEventListener("load", getWorldAndBuildGraph)