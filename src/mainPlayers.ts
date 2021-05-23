/// <reference types="bootstrap" />
/// <reference path="./config.ts" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />
/// <reference path="./dataSource.ts" />
/// <reference path="./common.ts" />

function updatePlayers(player : string | null, pilot : string | null) {
    return async function() {
        const listPlayers = document.getElementById("list-players")
        const divNick = document.getElementById("div-nickname")
        const listPilots = document.getElementById("list-pilots")
        const listFlights = document.getElementById("list-flights")
        const listEvents = document.getElementById("list-events")

        var selectedPlayer : Player | null = null
        var selectedPilot : Pilot | null = null
        var selectedFlight : MissionRecord | null = null

        function createTextCol(text : string) {
            const nameCol = document.createElement("td")
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
                selectedFlight = flight
                removeAllChildren(listEvents)
                for (const ev of flight.DamagedTargets) {
                    const row = document.createElement("tr")
                    row.appendChild(createTextCol(ev.Ammo))
                    row.appendChild(createTextCol(`${ev.Amount*100}%`))
                    row.appendChild(createTextCol(targetString(ev.Target)))
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
                    const row = document.createElement("tr")
                    row.appendChild(createTextCol(`${dateToStr(flight.StartDate)} ${flight.StartAirfield}`))
                    row.appendChild(createTextCol(flight.Plane))
                    row.appendChild(createTextCol(`${flight.AirKills}`))
                    row.appendChild(createTextCol(`${dateToStr(flight.EndDate)} ${returnStatusString(flight.ReturnStatus)}`))
                    row.appendChild(createTextCol(`${flight.PlaneHealth * 100}%`))
                    row.addEventListener("click", flightClicked(flight))
                    listFlights?.appendChild(row)
                }
            }
        }

        const playerClicked = function(player : Player) {
            return async function() {
                selectedPlayer = player
                selectedPilot = null
                selectedFlight = null
                removeAllChildren(listPilots)
                removeAllChildren(listFlights)
                removeAllChildren(listEvents)
            
                // Set player info box
                removeAllChildren(divNick)
                divNick?.appendChild(
                    document.createTextNode(player.Name)
                )
                // List of pilots controlled by that player
                removeAllChildren(listPilots)
                for (const pilotId of player.Pilots) {
                    const pilotAndMissions = await dataSource.getPilot(pilotId)
                    if (pilotAndMissions) {
                        const pilot = pilotAndMissions.Pilot
                        const entry = document.createElement("tr")

                        const rankCol = createTextCol(pilot.RankAbbrev)
                        entry.appendChild(rankCol)

                        const nameCol = createTextCol(`${pilot.FirstName} ${pilot.LastName}`)
                        entry.appendChild(nameCol)

                        const countryCol = createTextCol(pilot.Country)
                        entry.appendChild(countryCol)

                        const missionsCol = createTextCol(`${pilot.Flights}`)
                        entry.appendChild(missionsCol)

                        const killsCol = createTextCol(`${pilot.AirKills}`)
                        entry.appendChild(killsCol)

                        const healthCol = createTextCol(`${healthString(pilot.Health)}`)
                        entry.appendChild(healthCol)

                        const missions = pilotAndMissions.Missions
                        if (missions.length > 0) {
                            const lastMission = missions[missions.length - 1]
                            const statusCol = createTextCol(`${returnStatusString(lastMission.ReturnStatus)}`)
                            entry.appendChild(statusCol)
                        }
                        else {
                            entry.appendChild(createTextCol("Inactive"))
                        }

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
                const row = document.createElement("tr")
                
                const playerName = document.createElement("td")
                playerName.appendChild(document.createTextNode(`${player.Name}`))
                playerName.addEventListener("click", playerClicked(player))
                row.appendChild(playerName)
                listPlayers?.appendChild(row)
            }
        }

        if (player) {
            const playerData = await dataSource.getPlayerByName(player)
            if (playerData) {
                await playerClicked(playerData)()
            }
        }

        if (pilot) {
            const pilotData = await dataSource.getPilot(pilot)
            if (pilotData) {
                await pilotClicked(pilotData.Pilot, pilotData.Missions)()
            }
        }
    }
}

const url = new URL(window.location.href)
const player = url.searchParams.get("player")
const pilot = url.searchParams.get("pilot")

window.addEventListener("load", updatePlayers(player, pilot))