// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron'
import { Settings, VerifiedGame } from './schema'
import { RequestBatchOptions, RequestBatchRequest, ResponseMessage } from 'obs-websocket-js'
import IpcRendererEvent = Electron.IpcRendererEvent
import { InstallProgress, SoftwareName } from './composables/useSoftware'

contextBridge.exposeInMainWorld('versions', {
    node: () => process.versions.node,
    chrome: () => process.versions.chrome,
    electron: () => process.versions.electron,
})

contextBridge.exposeInMainWorld('electron', {
    preload: () =>
        ipcRenderer.invoke('preload'),
    needsDevTools: () =>
        ipcRenderer.invoke('needs-devtools'),
    getHostname: () =>
        ipcRenderer.invoke('hostname'),
    //
    desktop: {
        closeWindow: () =>
            ipcRenderer.send('close-window'),
        minimizeWindow: () =>
            ipcRenderer.send('minimize-window'),
        maximizeWindow: () =>
            ipcRenderer.send('maximize-window'),
        quit: () =>
            ipcRenderer.send('quit'),
        authenticate: (accessToken: unknown) =>
            ipcRenderer.send('authenticate', accessToken),
        getDeviceId: () =>
            ipcRenderer.invoke('get-device-id'),
        magicLogin: () =>
            ipcRenderer.invoke('magic-login'),
        logout: () =>
            ipcRenderer.send('logout'),
    },

    // deprecated
    authenticate: (accessToken: unknown) =>
        ipcRenderer.send('authenticate', accessToken),

    //
    toggleOverlay: () =>
        ipcRenderer.invoke('toggle-overlay'),
    toggleOverlayAudio: () =>
        ipcRenderer.invoke('toggle-overlay-audio'),
    clearCache: () =>
        ipcRenderer.invoke('clear-cache'),
    commitSettings: (settings: Settings) =>
        ipcRenderer.invoke('commit-settings', settings),
    getSettings: () =>
        ipcRenderer.invoke('settings'),
    onSettingsChanged: (callback: (settings: Settings) => void) =>
        ipcRenderer.on('settings', (event: any, ...args: any) => callback(args[0])),
    getGames: () =>
        ipcRenderer.invoke('games'),
    onGamesChanged: (callback: (verifiedGames: Array<VerifiedGame>) => void) =>
        ipcRenderer.on('games', (event: any, ...args: any) => callback(args[0])),
    getDisplays: () =>
        ipcRenderer.invoke('get-displays'),
    requestDisplayUpdate: () =>
        ipcRenderer.invoke('request-display-update'),
    // Software APIs
    software: {
        get: (name: SoftwareName) =>
            ipcRenderer.invoke('software:get', name),
        install: (name: SoftwareName, progressCallback: (progress: InstallProgress) => void) =>
            ipcRenderer.invoke('software:install', name, progressCallback),
    },
    // OBS Studio WebSocket API
    obs: {
        connected: (): Promise<boolean> =>
            ipcRenderer.invoke('obs:connected'),
        credentials: (url?: string, password?: string): Promise<any> =>
            ipcRenderer.invoke('obs:credentials', url, password),
        connect: (url?: string, password?: string, identificationParams?: {}): Promise<any> =>
            ipcRenderer.invoke('obs:connect', url, password, identificationParams),
        disconnect: (): Promise<void> =>
            ipcRenderer.invoke('obs:disconnect'),
        call: (requestType: string, requestData?: object): Promise<any> =>
            ipcRenderer.invoke('obs:call', requestType, requestData),
        callBatch: (requests: RequestBatchRequest[], options?: RequestBatchOptions): Promise<ResponseMessage[]> =>
            ipcRenderer.invoke('obs:call-batch', requests, options),
        on: (event: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
            ipcRenderer.on(`obs:${event}`, listener),
        once: (event: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
            ipcRenderer.once(`obs:${event}`, listener),
        off: (event: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
            ipcRenderer.off(`obs:${event}`, listener),
        addListener: (event: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
            ipcRenderer.addListener(`obs:${event}`, listener),
        removeListener: (event: string, listener: (event: IpcRendererEvent, ...args: any[]) => void) =>
            ipcRenderer.removeListener(`obs:${event}`, listener),
    },
})