/// <reference types="bootstrap" />
/// <reference path="./config.ts" />
/// <reference path="./util.ts" />
/// <reference path="./types.ts" />
/// <reference path="./dataSource.ts" />
/// <reference path="./common.ts" />

// Various HTML elements to hook on
const divStatus = document.getElementById("status-div") as HTMLDivElement
const tablePlayers = document.getElementById("table-pilots")
const btnRefreshStatus = document.getElementById("btn-refresh")

async function updateStatus() {
    var command = "/query/sync/state"
    const response = await fetch(config.campaignServerUrl + command)
    const message = await response.json()
    removeAllChildren(divStatus)
    divStatus?.appendChild(document.createTextNode(message.Value))
}

async function updateOnlinePlayers() {
    const online = await dataSource.getOnlinePlayers()
    removeAllChildren(tablePlayers)
    if (online) {
        for (const player of online.Players) {
            tablePlayers?.appendChild(
                document.createElement("tr").appendChild(
                    document.createElement("td").appendChild(
                        document.createTextNode(player)
                    )
                )
            )
        }
    }
}

btnRefreshStatus?.addEventListener("click", updateStatus)
btnRefreshStatus?.addEventListener("click", updateOnlinePlayers)
window.addEventListener("load", updateStatus)
window.addEventListener("load", updateOnlinePlayers)