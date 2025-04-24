export function createWindow(params) {
    return window.ipcRenderer.sendSync("window--new-window", params);
}

export function closeWindow(params) {
    return window.ipcRenderer.send("window--close-window", params);
}

export function window__setSize(params) {
    return window.ipcRenderer.send(
        "window--call-method", 
        { method_name: 'setSize', ...params }
    );
}

export function createView(params) {
    return window.ipcRenderer.sendSync("view--new-view", params);
}

export function setViewToWindow(params) {
    return window.ipcRenderer.sendSync("window--set-view", params);
}