import { BrowserWindow } from 'electron'

export function emit(event: any, ...args: any) {
    // Send a message to all windows
    BrowserWindow.getAllWindows().forEach((win) => {
        if (win.isDestroyed()) return
        win.webContents.send(event, ...args)
    })
}