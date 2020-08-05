/// <reference types="bootstrap" />
/// <reference path="./config.ts" />

import * as base64 from "base-64"
import * as utf8 from "utf8"

export function setup() {
    // Various HTML elements to hook on
    const inputPassword = document.getElementById("input-password") as HTMLInputElement
    const inputArgument = document.getElementById("input-argument") as HTMLInputElement
    const radioControls = document.getElementsByName("radio-control")
    const btnSubmit = document.getElementById("btn-submit")

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

        // var content = ""
        // if (command === "/control/reset") {

        // }

        const headers = new Headers()
        headers.append("Authorization", "Basic " + base64.encode(utf8.encode("admin:" + password)))
        const response = await fetch(config.campaignServerUrl + command,
            {
                method: 'POST',
                headers: headers
            })
        console.debug(response)
    })
}