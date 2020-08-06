type Dict<T> = Partial<Record<string, T>>

// A silly function to print minutes, month and day numbers nicely, with 2 digits and a leading 0 if needed.
function dig2(n: number): string {
    if (n < 10) 
        return "0" + n.toString()
    return n.toString()
}

// Remove all children from an HTML element
function removeAllChildren(elmt : HTMLElement | null) {
    if (elmt == null)
        return
    while (elmt.lastChild != null) {
        elmt.removeChild(elmt.lastChild)
    }
}

// Get the keys of a Dict
function keysOf<T>(dict : Dict<T> | null | undefined) {
    return Object.getOwnPropertyNames(dict)
}

// Get the values in a Dict
function valuesOf<T>(dict : Dict<T> | null | undefined): T[] {
    if (dict == null || dict == undefined)
        return []
    let ret: T[] = []
    const values = keysOf(dict).map(k => dict[k])
    for(const v of values) {
        if (v != undefined) ret.push(v)
    }
    return ret
}

function sum(xs: number[]) {
    return xs.reduce((x, y) => x + y, 0)
}

function mkUnumberedList(items: string[]) {
    const ul = document.createElement("ul")
    for (const item of items) {
        const li = document.createElement("li")
        const txt = document.createTextNode(item)
        li.appendChild(txt)
        ul.appendChild(li)
    }
    return ul
}

// Create a spinner and add it to the children of a parent node
function addSpinner(parent: HTMLElement | null) {
    if (parent == null)
        return
    const spinner = document.createElement("div")
    spinner.setAttribute("class", "spinner-border")
    spinner.setAttribute("role", "status")
    spinner.setAttribute("id", "spinner")
    console.debug(parent)
    parent.appendChild(spinner)
    console.debug(parent.children)
    console.debug(spinner)
}

// Remove spinner(s) previously added by addSpinner
function removeSpinner(parent : HTMLElement | null) {
    if (parent == null)
        return

    for (const child of parent.children) {
        if (child.getAttribute("id") == "spinner") {
            console.debug(child)
            parent.removeChild(child)
        }
    }
}
