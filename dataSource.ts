/// <reference path="./types.ts" />

interface DataSource {
    getWorld(): Promise<World | null>
    getDates(): Promise<DateTime[] | null>
    getState(idx: number): Promise<WarState | null>
    getSimulationSteps(idx: number): Promise<SimulationStep[] | null>
}

class WebDataSource implements DataSource {
    url = ""
    constructor(url: string) {
        this.url = url
    }

    async getWorld() {
        const response = await fetch(this.url + "/query/world")
        if (!response.ok)
            return null
        const world : World = await response.json()
        return world
    }

    async getDates() {
        const response = await fetch(this.url + "/query/dates")
        if (!response.ok)
            return null
        const dates = await response.json() as DateTime[]
        return dates
    }

    async getState(idx: number) {
        const query = `/query/past/${idx}`
        const dayResponse = await fetch(this.url + query)
        if (!dayResponse.ok)
            return null
        const state = await dayResponse.json() as WarState
        return state
    }

    async getSimulationSteps(idx: number) {
        const responseSim = await fetch(this.url + `/query/simulation/${idx}`)
        if (!responseSim.ok)
            return null
        const simData = await responseSim.json() as SimulationStep[]
        return simData
    }
}