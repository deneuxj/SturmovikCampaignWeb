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

    async getPilots(health: "OnlyHealthy" | "NoDead" | null, coalition: string | null, country: string | null, namePattern: string | null) {
        var params = []
        if (health) {
            params.push("health=" + health)
        }
        if (coalition) {
            params.push("coalition=" + encodeURIComponent(coalition))
        }
        if (country) {
            params.push("country=" + encodeURIComponent(country))
        }
        if (namePattern) {
            params.push("name=" + encodeURIComponent(namePattern))
        }
        var url = this.url + "/query/pilots"
        if (params.length > 0)
            url = url + "?" + params.join("&")
        const response = await fetch(url)
        if (!response.ok)
            return null
        const pilots = await response.json() as Pilot[]
        return pilots
    }
}