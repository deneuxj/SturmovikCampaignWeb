import * as Types from "./types"

export interface DataSource {
    getWorld(): Promise<Types.World | null>
    getDates(): Promise<Types.DateTime[] | null>
    getState(idx: number): Promise<Types.WarState | null>
    getSimulationSteps(idx: number): Promise<Types.SimulationStep[] | null>
}

export class WebDataSource implements DataSource {
    url = ""
    constructor(url: string) {
        this.url = url
    }

    async getWorld() {
        const response = await fetch(this.url + "/query/world")
        if (!response.ok)
            return null
        const world : Types.World = await response.json()
        return world
    }

    async getDates() {
        const response = await fetch(this.url + "/query/dates")
        if (!response.ok)
            return null
        const dates = await response.json() as Types.DateTime[]
        return dates
    }

    async getState(idx: number) {
        const query = `/query/past/${idx}`
        const dayResponse = await fetch(this.url + query)
        if (!dayResponse.ok)
            return null
        const state = await dayResponse.json() as Types.WarState
        return state
    }

    async getSimulationSteps(idx: number) {
        const responseSim = await fetch(this.url + `/query/simulation/${idx}`)
        if (!responseSim.ok)
            return null
        const simData = await responseSim.json() as Types.SimulationStep[]
        return simData
    }
}