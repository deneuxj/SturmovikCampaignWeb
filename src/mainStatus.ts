/// <reference types="bootstrap" />
/// <reference path="./config.ts" />
/// <reference path="./util.ts" />

// Various HTML elements to hook on
const divStatus = document.getElementById("status-div") as HTMLDivElement
const tablePlayers = document.getElementsByName("table-pilots")
const btnRefreshStatus = document.getElementById("btn-refresh")

async function updateStatus() {
    var command = "/query/sync/state"
    const response = await fetch(config.campaignServerUrl + command)
    const message = await response.json()
    removeAllChildren(divStatus)
    divStatus?.appendChild(document.createTextNode(message.Value))
}

btnRefreshStatus?.addEventListener("click", updateStatus)
window.addEventListener("load", updateStatus)