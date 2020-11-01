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
    const listFlights = document.getElementById("list-flights")
    const listEvents = document.getElementById("list-events")

    var selectedPlayer : Player | null = null

    const playerClicked = function(player : Player) {
        return async function() {
            selectedPlayer = player
            removeAllChildren(divNick)
            divNick?.appendChild(
                document.createTextNode(player.Name)
            )
            removeAllChildren(divPrevNicks)
            removeAllChildren(divBanStatus)
            divBanStatus?.appendChild(
                document.createTextNode(banString(player.BanStatus))
            )
            removeAllChildren(listPilots)
            for (const pilot of player.Pilots) {
                const entry = document.createElement("li")
                const content = document.createTextNode(`${pilot.FirstName} ${pilot.LastName}`)
                entry.appendChild(content)
                listPilots?.appendChild(entry)
            }
        }
    }

    removeAllChildren(listPlayers)
    const players = await dataSource.getPlayers()
    if (players) {
        for (const player of players) {
            const entry = document.createElement("div")
            const content = document.createTextNode(`<div>${player.Name}</div>`)
            entry.addEventListener("click", playerClicked(player))
            entry.appendChild(content)
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