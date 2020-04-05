import { Dict, keysOf, dig2 } from "./util"

// -------- Types: SturmovikCampaign's WebController
export type Coalition = "Allies" | "Axis"

export interface Vector2 {
    X: number
    Y: number
}

export interface OrientedPosition {
    Position: Vector2
    Altitude: number
    Rotation: number
}

export interface BuildingProperties {
    Id: number
    Model: string
    Capacity: number
}

export interface BuildingInstance {
    Position: OrientedPosition
    PropertiesId: number
}

export interface Airfield {
    Id: string
    Position: Vector2
    Region: string
    Buildings: BuildingInstance[]
}

export interface Region {
    Id: string
    Boundary: Vector2[]
    Position: Vector2
    InitialOwner: Coalition | null
    Buildings: BuildingInstance[]
}
 
export interface PlaneModel {
    Name: string
}

export interface World {
    Scenario: string
    Map: string
    MapSouthWest: Vector2
    MapNorthEast: Vector2
    Regions: Region[]
    Airfields: Airfield[]
    PlaneSet: PlaneModel[]
    BuildingProperties: BuildingProperties[]
}

export interface DateTime {
    Year: number
    Month: number
    Day: number
    Hour: number
    Minute: number
}

export function dateToStr(date: DateTime): string {
    return `${date.Year}-${dig2(date.Month)}-${dig2(date.Day)} ${date.Hour}:${dig2(date.Minute)}`
}

export interface GroundForces {
    Region: string
    Coalition: Coalition
    Forces: number
}

export interface BuildingStatus {
    Position: OrientedPosition
    HealthLevel: number
    FunctionalityLevel: number
}

export interface WarState {
    Date: DateTime
    GroundForces: GroundForces[]
    RegionOwner: Dict<Coalition>
    SupplyStatus: Dict<number>
    Planes: Dict<Dict<number>>
    BuildingHealth: BuildingStatus[]
}

export interface DamageBuildingPartArgs {
    BuildingAt: OrientedPosition
    Part: number
    Damage: number
}

export interface DamageBuildingPartCmd {
    Verb: "DamageBuildingPart"
    Args: DamageBuildingPartArgs
}

export interface RepairBuildingPartArgs {
    BuildingAt: OrientedPosition
    Part: number
    Repair: number
}

export interface RepairBuildingPartCmd {
    Verb: "RepairBuildingPart"
    Args: RepairBuildingPartArgs
}

export interface AddRemovePlaneArgs {
    Airfield: string
    Plane: string
    Amount: number
}

export interface AddRemovePlaneCmd {
    Verb: "RemovePlane" | "AddPlane"
    Args: AddRemovePlaneArgs
}

export interface AddDestroyGroundForcesArgs {
    Region: string
    Coalition: Coalition
    Amount: number
}

export interface AddDestroyGroundForcesCmd {
    Verb: "AddGroundForces" | "DestroyGroundForces"
    Args: AddDestroyGroundForcesArgs
}

export interface MoveGroundForcesArgs {
    Start: string
    Destination: string
    Coalition: Coalition
    Amount: number
}

export interface MoveGroundForcesCmd {
    Verb: "MoveGroundForces"
    Args: MoveGroundForcesArgs
}

export interface SetRegionOwnerArgs {
    Region: string
    Coalition: Coalition
}

export interface SetRegionOwnerCmd {
    Verb: "SetRegionOwner"
    Args: SetRegionOwnerArgs
}

export interface AdvanceTimeArgs {
    Hours: number
}

export interface AdvanceTimeCmd {
    Verb: "AdvanceTime"
    Args: AdvanceTimeArgs
}

export interface OtherCmd {
    Verb: string
    Args: any
}

export type Command = DamageBuildingPartCmd | RepairBuildingPartCmd | AddRemovePlaneCmd | AddDestroyGroundForcesCmd | MoveGroundForcesCmd | SetRegionOwnerCmd | AdvanceTimeCmd | OtherCmd

export function commandToHtml(cmd: Command) {
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

export interface UpdatedStorageValues {
    BuildingAt: OrientedPosition
    Amount: number
}

export interface UpdatedStorageResult {
    ChangeDescription: "UpdatedStorageValue"
    Values: UpdatedStorageValues
}

export interface UpdatedPlanesValues {
    Airfield: string
    Planes: Dict<number>
}

export interface UpdatedPlanesResult {
    ChangeDescription: "UpdatedPlanesAtAirfield"
    Values: UpdatedPlanesValues
}

export interface UpdatedGroundForcesValues {
    Region: string
    Coalition: Coalition
    Forces: number
}

export interface UpdatedGroundForcesResult {
    ChangeDescription: "UpdatedGroundForces"
    Values: UpdatedGroundForcesValues
}

export interface RegionOwnerSetValues {
    Region: string
    Coalition: Coalition
}

export interface RegionOwnerSetResult {
    ChangeDescription: "RegionOwnerSet"
    Values: RegionOwnerSetValues
}

export interface TimeSetValues {
    DateTime: DateTime
}

export interface TimeSetResult {
    ChangeDescription: "TimeSet"
    Values: TimeSetValues
}

export interface OtherResult {
    ChangeDescription: string
    Values: any
}

export type Result = UpdatedStorageResult | UpdatedPlanesResult | UpdatedGroundForcesResult | RegionOwnerSetResult | TimeSetResult | OtherResult

export function resultToHtml(result: Result) {
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

export interface SimulationStep {
    Description: string
    Command: Command[]
    Results: Result[]
}

export function simulationStepToHtml(step : SimulationStep) {
    const small = document.createElement("small")
    const txt = document.createTextNode(step.Description)
    small.appendChild(txt)
    return small
}

// Annotate a region with its current owner
export class RegionWithOwner {
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
