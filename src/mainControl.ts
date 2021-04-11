/// <reference types="bootstrap" />
/// <reference path="./config.ts" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />

// Various HTML elements to hook on
async function loadControl() {
    const inputPassword = document.getElementById("input-password") as HTMLInputElement
    const inputArgument = document.getElementById("input-argument") as HTMLInputElement
    const inputPlayerName = document.getElementById("input-player-name") as HTMLInputElement
    const radioControls = document.getElementsByName("radio-control")
    const btnCheckName = document.getElementById("btn-check-name")
    const btnSubmit = document.getElementById("btn-submit")
    const paraResult = document.getElementById("p-result")

    const btnRefresh = document.getElementById("btn-refresh")
    const paraStatus = document.getElementById("p-status")

    var selectedPlayer : Player | null = null

    btnSubmit?.addEventListener("click", async () => {
        const password = inputPassword?.value
        var method = "POST"
        var command : string | null = "/query/sync/state"
        var url = config.campaignServerUrl
        for (const radioControl of radioControls) {
            const radioControlInput = radioControl as HTMLInputElement
            if (radioControlInput?.checked) {
                command = radioControlInput?.value
            }
        }

        var content = ""
        if (command === "/control/reset") {
            content = JSON.stringify({ Scenario: inputArgument.value })
        }
        else if (command === "/admin/ban") {
            if (selectedPlayer) {
                url = config.banEnforcerUrl
                const inputDaysBan = document.getElementById("input-days-ban") as HTMLInputElement
                const days = inputDaysBan.valueAsNumber
                command = `/bans/${selectedPlayer.Guid.Guid}`
                if (days <= 0) {
                    method = "DELETE"
                }
                else {
                    content = JSON.stringify({Days: days, Hours: 0})
                }
            }
            else {
                removeAllChildren(paraResult)
                paraResult?.appendChild(document.createTextNode("Check player name first"))
                command = null
            }
        }

        if (command) {
            console.info(command)

            removeAllChildren(paraResult)
            addSpinner(paraResult)
            const headers = new Headers()
            headers.append("Authorization", "Basic " + btoa("admin:" + password))
            const response = await fetch(url + command,
                {
                    method: method,
                    headers: headers,
                    body: content
                })
            console.debug(response)
            removeSpinner(paraResult)
            if (response.status == 200) {
                const message = await response.json()
                console.debug(message)
                paraResult?.appendChild(document.createTextNode("OK " + message.Value))
            }
            else if (response.status == 409) {
                const message = await response.text()
                console.debug(message)
                paraResult?.appendChild(document.createTextNode("Error " + message))
            }
            else {
                paraResult?.appendChild(document.createTextNode(response.statusText))
            }
        }
    })

    btnRefresh?.addEventListener("click", async () => {
        var command = "/query/sync/state"
        const response = await fetch(config.campaignServerUrl + command)
        const message = await response.json()
        removeAllChildren(paraStatus)
        paraStatus?.appendChild(document.createTextNode(message.Value))
    })

    if (inputPlayerName) {
        btnCheckName?.addEventListener("click", async () => {
            var command = `/query/players?name=${inputPlayerName.value}`
            const response = await fetch(config.campaignServerUrl + command)
            if (response.ok) {
                const players : Player[] = await response.json()
                if (players.length == 1) {
                    const divBanStatus = document.getElementById("div-ban-status")
                    selectedPlayer = players[0]
                    inputPlayerName.value = selectedPlayer.Name
                    removeAllChildren(divBanStatus)
                    removeAllChildren(paraResult)
                    paraResult?.appendChild(document.createTextNode("Player found"))
                    const banDataResponse = await fetch(config.banEnforcerUrl + `/bans/${selectedPlayer.Guid.Guid}`)
                    var statusStr = "Not banned"
                    if (banDataResponse.ok) {
                        const banData : MaybeUntil = await banDataResponse.json()
                        if (banData.Value != null) {
                            statusStr = `Banned until ${dateToStr(banData.Value.Until)}`
                        }
                    }
                    else {
                        statusStr = "Failed to ban"
                    }
                    divBanStatus?.appendChild(document.createTextNode(statusStr))
                }
                else if (players.length == 0) {
                    removeAllChildren(paraResult)
                    paraResult?.appendChild(document.createTextNode("Player not found"))
                }
                else {
                    removeAllChildren(paraResult)
                    paraResult?.appendChild(document.createTextNode("More than one player found"))
                }
            }
        })
    }
}

window.addEventListener("load", loadControl)