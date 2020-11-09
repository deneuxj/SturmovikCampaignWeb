/// <reference types="bootstrap" />
/// <reference path="./config.ts" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />
/// <reference path="./dataSource.ts" />
/// <reference path="./sampleData.ts" />
/// <reference path="./common.ts" />

async function updatePlayers() {
    const listPlayers = document.getElementById("list-players")
    const divNick = document.getElementById("div-nickname")
    const divPrevNicks = document.getElementById("div-prevnicks")
    const divBanStatus = document.getElementById("div-ban-status")
    const inputDaysBan = document.getElementById("input-days-ban") as HTMLInputElement
    const btnBan = document.getElementById("btn-ban") as HTMLButtonElement
    const btnClear = document.getElementById("btn-clear-ban") as HTMLButtonElement
    const inputPassword = document.getElementById("input-pwd") as HTMLInputElement
    const listPilots = document.getElementById("list-pilots")

    var selectedPlayer : Player | null = null
    var selectedPilot : Pilot | null = null
    var selectedFlight : MissionRecord | null = null

    function createTextCol(size : string, text : string) {
        const nameCol = document.createElement("div")
        nameCol.className = `col-${size}`
        const content = document.createTextNode(text)
        nameCol.appendChild(content)
        return nameCol
    }

    function setTextContent(node : null | HTMLElement, text : string) {
        removeAllChildren(node)
        node?.appendChild(document.createTextNode(text))
    }

    function flightClicked(flight : MissionRecord) {
        return async function() {
            const listEvents = document.getElementById("list-events")

            selectedFlight = flight
            removeAllChildren(listEvents)
            for (const ev of flight.DamagedTargets) {
                const row = document.createElement("div")
                row.className = "row"
                row.appendChild(createTextCol("4", ev.Ammo))
                row.appendChild(createTextCol("4", `${ev.Amount*100}%`))
                row.appendChild(createTextCol("4", targetString(ev.Target)))
                listEvents?.appendChild(row)
            }
        }
    }
    const pilotClicked = function(pilot : Pilot, flights : MissionRecord[]) {
        return async function() {
            const divPilotName = document.getElementById("div-pilot-name")
            const divPilotRank = document.getElementById("div-pilot-rank")
            const divPilotKills = document.getElementById("div-pilot-kills")
            const divPilotCountry = document.getElementById("div-pilot-country")
            const divPilotHealth = document.getElementById("div-pilot-health")
            const listFlights = document.getElementById("list-flights")

            selectedPilot = pilot

            // Set pilot info box
            setTextContent(divPilotName, `${pilot.FirstName} ${pilot.LastName}`)
            setTextContent(divPilotRank, pilot.Rank)
            setTextContent(divPilotKills, `${pilot.AirKills}`)
            setTextContent(divPilotCountry, pilot.Country)
            setTextContent(divPilotHealth, healthString(pilot.Health))
            
            // Flights
            removeAllChildren(listFlights)
            for (const flight of flights) {
                const row = document.createElement("div")
                row.className = "row"
                row.appendChild(createTextCol("3", `${dateToStr(flight.StartDate)} ${flight.StartAirfield}`))
                row.appendChild(createTextCol("2", flight.Plane))
                row.appendChild(createTextCol("2", `${flight.AirKills} air kills`))
                row.appendChild(createTextCol("3", `${dateToStr(flight.EndDate)} ${returnStatusString(flight.ReturnStatus)}`))
                row.appendChild(createTextCol("2", `${flight.PlaneHealth * 100}%`))
                row.addEventListener("click", flightClicked(flight))
                listFlights?.appendChild(row)
            }
        }
    }

    const playerClicked = function(player : Player) {
        return async function() {
            selectedPlayer = player
            // Set player info box
            removeAllChildren(divNick)
            divNick?.appendChild(
                document.createTextNode(player.Name)
            )
            removeAllChildren(divPrevNicks)
            removeAllChildren(divBanStatus)
            divBanStatus?.appendChild(
                document.createTextNode(banString(player.BanStatus))
            )
            // List of pilots controlled by that player
            removeAllChildren(listPilots)
            for (const pilotId of player.Pilots) {
                const pilotAndMissions = await dataSource.getPilot(pilotId)
                if (pilotAndMissions) {
                    const pilot = pilotAndMissions.Pilot
                    const entry = document.createElement("div")
                    entry.className = "row"

                    const rankCol = createTextCol("1", pilot.RankAbbrev)
                    entry.appendChild(rankCol)

                    const nameCol = createTextCol("3", `${pilot.FirstName} ${pilot.LastName}`)
                    entry.appendChild(nameCol)

                    const countryCol = createTextCol("2", pilot.Country)
                    entry.appendChild(countryCol)

                    const missionsCol = createTextCol("1", `${pilot.Flights}`)
                    entry.appendChild(missionsCol)

                    const killsCol = createTextCol("1", `${pilot.AirKills}`)
                    entry.appendChild(killsCol)

                    const healthCol = createTextCol("2", `${healthString(pilot.Health)}`)
                    entry.appendChild(healthCol)

                    const missions = pilotAndMissions.Missions
                    const lastMission = missions[missions.length - 1]
                    const statusCol = createTextCol("2", `${returnStatusString(lastMission.ReturnStatus)}`)
                    entry.appendChild(statusCol)

                    entry.addEventListener("click", pilotClicked(pilot, pilotAndMissions.Missions))

                    listPilots?.appendChild(entry)
                }
            }
        }
    }

    removeAllChildren(listPlayers)
    const players = await dataSource.getPlayers()
    if (players) {
        for (const player of players) {
            const row = document.createElement("div")
            row.className = "row"
            const entry = document.createElement("div")
            entry.className = "col-12"
            entry.addEventListener("click", playerClicked(player))
            const content = document.createTextNode(`${player.Name}`)
            entry.appendChild(content)
            row.appendChild(entry)
            listPlayers?.appendChild(entry)
        }
    }

    btnBan?.addEventListener("click", async function() {
        if (selectedPlayer) {
            const days = inputDaysBan.valueAsNumber
            const content = JSON.stringify({Days: days})
            const url = dataSource.url + `/admin/${selectedPlayer.Guid}/ban`
            const headers = new Headers()
            const password = inputPassword.value ?? ""
            headers.append("Authorization", "Basic " + btoa("admin:" + password))
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: content
            })
        }
    })

    btnClear?.addEventListener("click", async function() {
        if (selectedPlayer) {
            const url = dataSource.url + `/admin/${selectedPlayer.Guid}/ban`
            const headers = new Headers()
            const password = inputPassword.value ?? ""
            headers.append("Authorization", "Basic " + btoa("admin:" + password))
            const response = await fetch(url, {
                method: 'DELETE',
                headers: headers
            })
        }
    })

}

window.addEventListener("load", updatePlayers)