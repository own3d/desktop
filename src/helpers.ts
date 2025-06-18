import { BrowserWindow } from 'electron'
import fs from 'fs'
import path from 'path'
import ini from 'ini'
import node_process from 'node:process'
import { createMainWindow } from './window/mainWindow'
import log from 'electron-log/main';

import { OBSWebSocket } from 'obs-websocket-js'

const jsonPath = path.join('obs-studio', 'plugin_config', 'obs-websocket', 'config.json')
const wellKnownConfigPaths = [
    path.join(getAppData(), jsonPath),
    path.join(getHome(), '.var', 'app', 'com.obsproject.Studio', 'config', jsonPath),
    path.join(getAppData(), 'obs-studio', 'global.ini'),
]

export interface OBSWebSocketConfigFile {
    file: string,
    config: OBSWebSocketConfig
}

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
        win.webContents.executeJavaScript(`
            Array.from(document.querySelectorAll('webview')).forEach((webview) => {
                webview.send('${event}', ...${JSON.stringify(args)});
            });
        `).catch(() => {})
    })
}

/**
 * Get the user's app data directory
 */
export function getAppData(): string {
    if (process.env.APPDATA)
        return process.env.APPDATA
    if (node_process.platform === 'darwin')
        return process.env.HOME + '/Library/Preferences'
    return process.env.HOME + '/.local/share'
}

/**
 * Get the user's home directory
 */
export function getHome(): string {
    if (process.env.HOME) {
        return process.env.HOME
    }
    return process.env.HOMEPATH
}

function getConfigPathFromPortableBinary(pathToBinary: string, ...segments: string[]): string {
    return path.normalize(path.join(path.dirname(pathToBinary), '..', '..', 'config', 'obs-studio', ...segments))
}

export function getINIPathFromPortableBinary(pathToBinary: string): string {
    return getConfigPathFromPortableBinary(pathToBinary, 'global.ini')
}

export function getJSONPathFromPortableBinary(pathToBinary: string): string {
    return getConfigPathFromPortableBinary(pathToBinary, 'plugin_config', 'obs-websocket', 'config.json')
}

function parseOBSConfig(path: string): OBSWebSocketConfigFile | undefined {
    let parsedConfig = path.endsWith('.ini') ? parseOBSConfigINI(path) : parseOBSConfigJSON(path)

    if (parsedConfig) {
        return {
            file: path,
            config: parsedConfig,
        } as OBSWebSocketConfigFile
    }

    return undefined
}

function parseOBSConfigINI(path: string): OBSWebSocketConfig | undefined {
    const obsConfig = ini.parse(fs.readFileSync(path, 'utf-8'))

    if (!obsConfig['OBSWebSocket']) {
        log.error('OBSWebSocket section not found in OBS config')
        return
    }

    return obsConfig['OBSWebSocket'] as OBSWebSocketConfig
}

function parseOBSConfigJSON(path: string): OBSWebSocketConfig | undefined {
    const obsConfig = JSON.parse(fs.readFileSync(path, 'utf-8'))

    return {
        AlertsEnabled: obsConfig['alerts_enabled'],
        AuthRequired: obsConfig['auth_required'],
        FirstLoad: obsConfig['first_load'],
        ServerEnabled: obsConfig['server_enabled'],
        ServerPassword: obsConfig['server_password'],
        ServerPort: obsConfig['server_port'],
    } as OBSWebSocketConfig
}

/**
 * Settings stored in global.ini will now be in plugin_config/obs-websocket/config.json
 * Persistent data stored in obsWebSocketPersistentData.json is now
 * located in plugin_config/obs-websocket/persistent_data.json
 */
export function discoverObsWebsocketCredentials(...additionalPaths: string[]): OBSWebSocketConfigFile | undefined {
    const pathsToSearch = [...additionalPaths.filter((p) => !!p), ...wellKnownConfigPaths]
    for (const configPath of pathsToSearch) {
        if (fs.existsSync(configPath)) {
            log.log(`Found OBS config at ${configPath}`)
            let credentials = parseOBSConfig(configPath)

            if (credentials) {
                return credentials
            }
        }
    }

    return undefined
}

export function setObsWebsocketCredentials(credentials: OBSWebSocketConfigFile) {
    const {file, config} = credentials
    // fist make backup of the file
    fs.copyFileSync(file, `${file}.bak`)
    log.log(`Backup of OBS config created at ${file}.bak`)

    if (file.endsWith('.json')) {
        const obsConfig = JSON.parse(fs.readFileSync(file, 'utf-8'))
        obsConfig['alerts_enabled'] = config.AlertsEnabled
        obsConfig['auth_required'] = config.AuthRequired
        obsConfig['first_load'] = config.FirstLoad
        obsConfig['server_enabled'] = config.ServerEnabled
        obsConfig['server_password'] = config.ServerPassword
        obsConfig['server_port'] = config.ServerPort
        fs.writeFileSync(file, JSON.stringify(obsConfig, null, 4))
        log.log(`Updated OBS config at ${file}`)
    }

    if (file.endsWith('.ini')) {
        const obsConfig = ini.parse(fs.readFileSync(file, 'utf-8'))
        obsConfig['OBSWebSocket'] = config
        fs.writeFileSync(file, ini.stringify(obsConfig))
        log.log(`Updated OBS config at ${file}`)
    }
}

export function getPatchedOBSWebSocket(): OBSWebSocket {
    const obs = new OBSWebSocket()

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

function dec2hex(dec: any) {
    return ('0' + dec.toString(16)).substr(-2)
}

export function generateRandomString() {
    const array = new Uint32Array(56 / 2)
    crypto.getRandomValues(array)
    return Array.from(array, dec2hex).join('')
}

function sha256(plain: any) {
    const encoder = new TextEncoder()
    const data = encoder.encode(plain)
    return crypto.subtle.digest('SHA-256', data)
}

function base64urlencode(a: any) {
    let str = ''
    const bytes = new Uint8Array(a)
    const len = bytes.byteLength
    for (let i = 0; i < len; i++) {
        str += String.fromCharCode(bytes[i])
    }
    return btoa(str)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '')
}

export async function getChallengeFromVerifier(v: any) {
    return base64urlencode(await sha256(v))
}
