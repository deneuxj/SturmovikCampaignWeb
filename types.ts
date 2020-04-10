/// <reference path="./util.ts" />

// -------- Types: SturmovikCampaign's WebController
type Coalition = "Allies" | "Axis"

interface Vector2 {
    X: number
    Y: number
}

function vNear(v1: Vector2, v2: Vector2) {
    const eps2 = 0.0001
    const dx = v1.X - v2.X
    const dy = v1.Y - v2.Y
    return dx * dx + dy * dy < eps2
}

interface OrientedPosition {
    Position: Vector2
    Altitude: number
    Rotation: number
}

function posEq(pos1: OrientedPosition, pos2: OrientedPosition) {
    return ( 
        pos1.Position.X === pos2.Position.X &&
        pos2.Position.Y === pos2.Position.Y &&
        pos1.Altitude === pos2.Altitude &&
        pos2.Rotation === pos2.Rotation)
}

interface BuildingProperties {
    Id: number
    Model: string
    Script: string
    Durability: number
    NumParts: number
    Capacity: null | number
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
    Neighbours: string[]
    IsEntry: boolean
}
 
interface PlaneModel {
    Name: string
    [propname: string]: any
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
    Bridges: BuildingInstance[]
    StartDate: DateTime
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

interface AdjacentRegionsTransportCapacity {
    RegionA: string
    RegionB: string
    Capacity: number
}

interface WarState {
    Date: DateTime
    GroundForces: GroundForces[]
    RegionOwner: Dict<Coalition>
    SupplyStatus: Dict<number>
    Planes: Dict<Dict<number>>
    BuildingHealth: BuildingStatus[]
    BridgeHealth: BuildingStatus[]
    RoadTransport: AdjacentRegionsTransportCapacity[]
    RailTransport: AdjacentRegionsTransportCapacity[]
    Weather: any
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
