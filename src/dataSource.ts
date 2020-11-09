/// <reference path="./types.ts" />

interface PilotSearchFilter {
    Health: "OnlyHealthy" | "NoDead" | null
    Coalition: string | null
    Country: string | null
    NamePattern: string | null
}

interface DataSource {
    getWorld(): Promise<World | null>
    getDates(): Promise<DateTime[] | null>
    getState(idx: number): Promise<WarState | null>
    getSimulationSteps(idx: number): Promise<SimulationStep[] | null>
    getPilots(filter: PilotSearchFilter | null): Promise<Pilot[] | null>
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

    async getPilots(filter: PilotSearchFilter | null) {
        var params = []
        if (filter?.Health) {
            params.push("health=" + filter.Health)
        }
        if (filter?.Coalition) {
            params.push("coalition=" + encodeURIComponent(filter.Coalition))
        }
        if (filter?.Country) {
            params.push("country=" + encodeURIComponent(filter.Country))
        }
        if (filter?.NamePattern) {
            params.push("name=" + encodeURIComponent(filter.NamePattern))
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

    async getPlayers() {
        var url = this.url + "/query/players"
        const response = await fetch(url)
        if (!response.ok)
            return null
        const players = await response.json() as Player[]
        return players
    }

    async getPilot(pilotId : string) {
        var url = this.url + "/query/pilot/" + pilotId
        const response = await fetch(url)
        if (!response.ok)
            return null
        const pilot = await response.json() as PilotWithMissionRecords
        return pilot
    }
}