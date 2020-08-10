/// <reference types="bootstrap" />
/// <reference path="./config.ts" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />
/// <reference path="./dataSource.ts" />
/// <reference path="./sampleData.ts" />
/// <reference path="./common.ts" />

const tablePilots = document.getElementById("table-pilots")

function healthString(health : HealthStatus) {
    if (health == "Healthy") return "Healthy"
    if (health == "Dead") return "Dead"
    return `Injured until ${dateToStr(health.Until)}`
}

async function fetchPilots(filter : PilotSearchFilter | null) {
    removeAllChildren(tablePilots)
    const results = await dataSource.getPilots(filter)
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

fetchPilots(null)