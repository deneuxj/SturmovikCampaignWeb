/// <reference types="bootstrap" />
/// <reference path="./config.ts" />
/// <reference path="./util.ts" />

// Various HTML elements to hook on
const inputPassword = document.getElementById("input-password") as HTMLInputElement
const inputArgument = document.getElementById("input-argument") as HTMLInputElement
const radioControls = document.getElementsByName("radio-control")
const btnSubmit = document.getElementById("btn-submit")
const paraResult = document.getElementById("p-result")

const btnRefresh = document.getElementById("btn-refresh")
const paraStatus = document.getElementById("p-status")

btnSubmit?.addEventListener("click", async () => {
    const password = inputPassword?.value
    var command = "/query/sync/state"
    for (const radioControl of radioControls) {
        const radioControlInput = radioControl as HTMLInputElement
        if (radioControlInput?.checked) {
            command = "/control/" + radioControlInput?.value
        }
    }

    console.info(command)

    var content = ""
    if (command === "/control/reset") {
        content = JSON.stringify({ Scenario: inputArgument.value })
    }

    removeAllChildren(paraResult)
    addSpinner(paraResult)
    const headers = new Headers()
    headers.append("Authorization", "Basic " + btoa("admin:" + password))
    const response = await fetch(config.campaignServerUrl + command,
        {
            method: 'POST',
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

})

btnRefresh?.addEventListener("click", async () => {
    var command = "/query/sync/state"
    const response = await fetch(config.campaignServerUrl + command)
    const message = await response.json()
    removeAllChildren(paraStatus)
    paraStatus?.appendChild(document.createTextNode(message.Value))
})