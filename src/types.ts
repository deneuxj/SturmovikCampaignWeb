/// <reference path="./util.ts" />

// -------- Types: SturmovikCampaign's WebController
type Coalition = "Allies" | "Axis"

function otherCoalition(coalition: Coalition) {
    switch(coalition) {
        case "Allies": return "Axis"
        case "Axis": return "Allies"
    }
}

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

interface RegionsTransportCapacity {
    RegionA: string
    RegionB: string
    Capacity: number
}

interface WarState {
    Date: DateTime
    GroundForces: GroundForces[]
    RegionOwner: Dict<Coalition>
    Planes: Dict<Dict<number>>
    BridgeHealth: BuildingStatus[]
    Weather: any
}

interface UntilDateTime {
    Until: DateTime
}

interface Injured {
    Injured: UntilDateTime
}

type HealthStatus = "Healthy" | "Dead" | Injured

function healthString(health : HealthStatus) {
    if (health == "Healthy") return "Healthy"
    if (health == "Dead") return "Dead"
    return `Injured until ${dateToStr(health.Injured.Until)}`
}

interface Pilot {
    Id : string
    Rank : string
    RankAbbrev : string
    FirstName : string
    LastName : string
    Country : string
    PlayerName : string
    Health : HealthStatus
    Flights : number
    AirKills : number
}

interface ShipTarget {
    Ship : string
}

interface ArtilleryTarget {
    Artillery : string
}

interface VehicleTarget {
    Vehicle : string
}

interface ParkedPlaneTarget {
    ParkedPlane : string
}

interface PlaneTarget {
    Plane : string
}

interface BuildingTarget {
    Building : string
}

interface BridgeTarget {
    Bridge : string
}

type TargetType = ShipTarget | VehicleTarget | ArtilleryTarget | ParkedPlaneTarget | PlaneTarget | BuildingTarget | BridgeTarget

function targetString(target : TargetType) {
    if ("Ship" in target) {
        return "Ship"
    }
    else if ("Artillery" in target) {
        return "Artillery"
    }
    else if ("Vehicle" in target) {
        return "Vehicle"
    }
    else if ("ParkedPlane" in target) {
        return "ParkedPlane"
    }
    else if ("Building" in target) {
        return "Building"
    }
    else if ("Bridge" in target) {
        return "Bridge"
    }
    return target.Plane
}

interface DamagedTarget {
    Amount : number
    Ammo : string
    Target : TargetType
}

interface LandedAtAirfieldReturnStatus {
    LandedAtAirfield : string
}

type ReturnStatus = LandedAtAirfieldReturnStatus | "CrashedInFriendlyTerritory" | "CrashedInEnemyTerritory" | "KilledInAction"

function returnStatusString(status : ReturnStatus) {
    switch (status) {
        case "CrashedInEnemyTerritory":
            return "Captured"
    
        case "CrashedInFriendlyTerritory":
            return "Crash landed"
            
        case "KilledInAction":
            return "Killed in action"

        default:
            return `At ${status.LandedAtAirfield}`
    }
}

interface MissionRecord {
    StartAirfield : string
    StartDate : DateTime
    EndDate : DateTime
    DamagedTargets : DamagedTarget[]
    AirKills : number
    ReturnStatus : ReturnStatus
    Plane : string
    PlaneHealth : number
}

interface PilotWithMissionRecords {
    Pilot : Pilot
    Missions : MissionRecord[]
}

interface HashedGuid {
    Guid : string
}

interface Player {
    Guid : HashedGuid
    Name : string
    Pilots : string[]
}

interface MaybeUntil {
    Value : UntilDateTime | null
}

interface Online {
    Players : string[]
}

interface TargetDifficulty {
    Size: "LargeTarget" | "SmallTarget"
    Mobility: number
    Space: "Air" | "Ground" | "Water"
}

function targetDifficultyString(td : TargetDifficulty) {
    var sz = "small"
    switch(td.Size) {
        case "LargeTarget": sz = "large"; break;
        default: break;
    }
    var mob = ""
    if (td.Mobility >= 2)
        mob = "nimble";
    else if (td.Mobility >= 1)
        mob = "mobile"
    else
        mob = "stationary"
    var space = ""
    switch(td.Space) {
        case "Air": space = "in the air"; break;
        case "Ground": space = "on the ground"; break;
        case "Water": space = "in sea or over rivers"; break;
        default: break;
    }
    return `${sz} ${mob} targets ${space}`
}

interface BonusDomain {
    UsingPlane: string
    Target: TargetDifficulty
    Ammo: string
}

interface Bonus {
    Start: string
    Bonus: number
    Domain: BonusDomain
}

function bonusHtmlRow(bonus : Bonus) {
    const start = `from ${bonus.Start} in a ${bonus.Domain.UsingPlane}`
    const desc = targetDifficultyString(bonus.Domain.Target)
    return `<tr><td>${start}</td><td>${desc} using ${bonus.Domain.Ammo}</td><td>${bonus.Bonus}</td></tr>`
}

// 
// Commands
//

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

//
// Command results
//

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
