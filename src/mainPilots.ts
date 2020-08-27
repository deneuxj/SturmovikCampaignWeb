/// <reference types="bootstrap" />
/// <reference path="./config.ts" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />
/// <reference path="./dataSource.ts" />
/// <reference path="./sampleData.ts" />
/// <reference path="./common.ts" />

const tablePilots = document.getElementById("table-pilots")
const btnFilter = document.getElementById("btn-filter")
const selCountry = document.getElementById("select-country") as HTMLSelectElement
const selCoalition = document.getElementById("select-coalition") as HTMLSelectElement
const selHealth = document.getElementById("select-health") as HTMLSelectElement
const inpName = document.getElementById("input-name") as HTMLInputElement

function healthString(health : HealthStatus) {
    if (health == "Healthy") return "Healthy"
    if (health == "Dead") return "Dead"
    return `Injured until ${dateToStr(health.Injured.Until)}`
}

async function fetchPilots(filter : PilotSearchFilter | null) {
    removeAllChildren(tablePilots)
    addSpinner(btnFilter)
    const results = await dataSource.getPilots(filter)
    removeSpinner(btnFilter)
    if (results) {
        for (const pilot of results) {
            tablePilots?.insertAdjacentHTML("beforeend",
                `<tr>
                    <td>${pilot.Id}</td>
                    <td>${pilot.RankAbbrev}</td>
                    <td>${pilot.FirstName}</td>
                    <td>${pilot.LastName}</td>
                    <td>${pilot.Country}</td>
                    <td>${healthString(pilot.Health)}</td>
                    <td>${pilot.Flights}</td>
                    <td>${pilot.AirKills}</td>
                    <td>${pilot.PlayerName}</td>
                </tr>`
            )
        }
    }
}

btnFilter?.addEventListener("click", async () => {
    var filter : PilotSearchFilter = 
    {
        Health: null,
        Country: null,
        Coalition: null,
        NamePattern: null
    }

    const country = selCountry?.options[selCountry?.selectedIndex].value
    if (country) {
        filter.Country = country
    }
    const coalition = selCoalition?.options[selCoalition?.selectedIndex].value
    if (coalition) {
        filter.Coalition = coalition
    }
    const health = selHealth?.options[selHealth?.selectedIndex].value
    if (health == "OnlyHealthy" || health == "NoDead") {
        filter.Health = health
    }
    const namePattern = inpName?.value
    if (namePattern) {
        filter.NamePattern = namePattern
    }
    fetchPilots(filter)
})

fetchPilots(null)