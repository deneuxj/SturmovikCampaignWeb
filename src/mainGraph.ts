/// <reference types="bootstrap" />
/// <reference types="plotly.js" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />
/// <reference path="./dataSource.ts" />
/// <reference path="./sampleData.ts" />
/// <reference path="./config.ts" />
/// <reference path="./common.ts" />


// Various HTML elements to hook on
const graphDiv = document.getElementById("visualization")

async function buildGraph(world : World) {
    if (graphDiv == null)
        return
    const dates = await dataSource.getDates()
    if (dates == null || world == null)
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
        async function asyncMap<U, V>(items: U[], func: ((x: U) => Promise<V>)) {
            var xs = []
            for (const item of items) {
                const x = await func(item)
                xs.push(x)
            }
            return xs
        }
        async function suppliesIn(regions: Region[]) {
            return sum(await asyncMap(regions, reg => dataSource.getRegionSupplies(i, reg.Id)))
        }
        async function capacityInRegion(region: Region) {
            return await dataSource.getRegionCapacity(i, region.Id)
        }
        async function capacityInAirfield(airfield: Airfield) {
            return await dataSource.getAirfieldCapacity(i, airfield.Id)
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
        axisSupplies.push(await suppliesIn(axisRegions))
        alliesSupplies.push(await suppliesIn(alliesRegions))
        axisGroundForces.push(totalGroundForces("Axis"))
        alliesGroundForces.push(totalGroundForces("Allies"))
        axisPlanes.push(planesAtAirfields(axisAirfields))
        alliesPlanes.push(planesAtAirfields(alliesAirfields))
        axisRegionCapacity.push(sum(await asyncMap(axisRegions, capacityInRegion)))
        alliesRegionCapacity.push(sum(await asyncMap(alliesRegions, capacityInRegion)))
        axisAirfieldCapacity.push(sum(await asyncMap(axisAirfields, capacityInAirfield)))
        alliesAirfieldCapacity.push(sum(await asyncMap(alliesAirfields, capacityInAirfield)))
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

async function getWorldAndBuildGraph() {
    const world = await dataSource.getWorld()
    if (world == null)
        return
    buildGraph(world)
}

window.addEventListener("load", getWorldAndBuildGraph)