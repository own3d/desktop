import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import ini from 'ini'
import node_process from 'node:process'
import { default as OBSWebSocket } from 'obs-websocket-js'
import { createMainWindow } from './window/mainWindow'

const {default: OBS} = require('obs-websocket-js')

export interface OBSWebSocketConfig {
    FirstLoad: boolean,
    ServerEnabled: boolean,
    ServerPort: string,
    AlertsEnabled: boolean,
    AuthRequired: boolean,
    ServerPassword: string
}

export function emit(event: any, ...args: any) {
    // Send a message to all windows
    BrowserWindow.getAllWindows().forEach((win) => {
        if (win.isDestroyed()) return
        win.webContents.send(event, ...args)
    })
}

export function getAppData(): string {
    if (process.env.APPDATA)
        return process.env.APPDATA
    if (node_process.platform === 'darwin')
        return process.env.HOME + '/Library/Preferences'
    return process.env.HOME + '/.local/share'
}

/**
 * todo: update this function to support the new config.json format
 * Settings stored in global.ini will now be in plugin_config/obs-websocket/config.json
 * Persistent data stored in obsWebSocketPersistentData.json is now
 * located in plugin_config/obs-websocket/persistent_data.json
 */
export function discoverObsWebsocketCredentials(): OBSWebSocketConfig | undefined {
    // on windows the ini file is located at %appdata%\obs-studio\global.ini
    const obsConfigPath = path.join(getAppData(), 'obs-studio', 'global.ini')

    if (!fs.existsSync(obsConfigPath)) {
        console.error(`OBS config file not found: ${obsConfigPath}`)
        return
    }

    const obsConfig = ini.parse(fs.readFileSync(obsConfigPath, 'utf-8'))

    if (!obsConfig['OBSWebSocket']) {
        console.error('OBSWebSocket section not found in OBS config')
        return
    }

    return obsConfig['OBSWebSocket']
}

export function getPatchedOBSWebSocket(): OBSWebSocket {
    const obs = new OBS()

    // patching the emit function to forward events to the renderer process
    const _emit = obs.emit
    // @ts-ignore
    obs.emit = function () {
        emit(`obs:${arguments[0]}`, ...arguments)
        _emit.apply(obs, arguments)
    }

    return obs
}

export function createWindowIfNotExists() {
    // check if the window is not already open, ignore all alwaysOnTop windows
    const browserWindows = BrowserWindow.getAllWindows().filter((window: any) => !window.isAlwaysOnTop())
    if (browserWindows.length === 0) {
        createMainWindow()
    }
}