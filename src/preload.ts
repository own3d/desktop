// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import { Settings, VerifiedGame } from './schema'

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
})

contextBridge.exposeInMainWorld('electron', {
    preload: () => ipcRenderer.invoke('preload'),
    getDashboardUrl: () => ipcRenderer.invoke('get-dashboard-url'),
    //
    closeWindow: () => ipcRenderer.send('close-window'),
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    quit: () => ipcRenderer.send('quit'),
    authenticate: (accessToken: unknown) => ipcRenderer.send('authenticate', accessToken),
    //
    toggleOverlay: () => ipcRenderer.invoke('toggle-overlay'),
    toggleOverlayAudio: () => ipcRenderer.invoke('toggle-overlay-audio'),
    clearCache: () => ipcRenderer.invoke('clear-cache'),
    commitSettings: (settings: Settings) => ipcRenderer.invoke('commit-settings', settings),
    getSettings: () => ipcRenderer.invoke('settings'),
    onSettingsChanged: (callback: (settings: Settings) => void) => ipcRenderer.on('settings', (event: any, ...args: any) => callback(args[0])),
    getGames: () => ipcRenderer.invoke('games'),
    onGamesChanged: (callback: (verifiedGames: Array<VerifiedGame>) => void) => ipcRenderer.on('games', (event: any, ...args: any) => callback(args[0])),
    getDisplays: () => ipcRenderer.invoke('get-displays'),
    requestDisplayUpdate: () => ipcRenderer.invoke('request-display-update'),
    //
    getDeviceId: () => ipcRenderer.invoke('get-device-id'),
})