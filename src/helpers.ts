import {BrowserWindow, WebviewTag} from "electron";

export function emit(event: any, ...args: any) {
    // Send a message to all windows
    BrowserWindow.getAllWindows().forEach((win) => {
        win.webContents.send(event, ...args)
    });
}