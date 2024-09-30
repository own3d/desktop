/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import Config from 'electron-config'
import electronSquirrelStartup from 'electron-squirrel-startup'
import { app, BrowserWindow } from 'electron'
import { updateElectronApp } from 'update-electron-app'
import { Settings, VerifiedGame } from './schema'
import { GameWatcher } from './game-watcher'
import { createWindowIfNotExists, emit, getPatchedOBSWebSocket } from './helpers'
import { SettingsRepository } from './settings'
import { AppLaunchWatcher } from './watch'
import { registerObsWebSocketHandlers } from './ipc/obs'
import { registerSoftwareHandlers } from './ipc/software'
import { registerAuthHandlers } from './ipc/auth'
import { registerDesktopHandlers } from './ipc/desktop'
import { registerCoreHandlers } from './ipc/core'
import { useContainer } from './composables/useContainer'

import OBSWebSocket from 'obs-websocket-js'
import { createMainWindow } from './window/mainWindow'
import { createBrowserSourceWindow } from './window/browserSource'
import {useRpcServer} from "./composables/useRpcServer";

export interface Argv {
    _: string[]
    devtools?: boolean
    localhost?: boolean
    hostname?: string
}

export interface Windows {
    mainWindow: BrowserWindow
    browserSource: BrowserWindow
}

/*
 * You can start the app with the following command:
 * yarn start -- -- --devtools --localhost
 */
const argv: Argv = require('boring')({})

updateElectronApp()

let windows: Windows = {
    mainWindow: null,
    browserSource: null,
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    // Handle creating/removing shortcuts on Windows when installing/uninstalling.
    if (electronSquirrelStartup) {
        app.quit()
    }

    const {bind, get} = useContainer()

    bind(SettingsRepository, new SettingsRepository())
    bind(GameWatcher, new GameWatcher())
    bind(OBSWebSocket, getPatchedOBSWebSocket())
    bind('config', new Config())
    bind('windows', windows)
    bind('argv', argv)

    // add emitters for settings and games (used in preload.ts)
    get(SettingsRepository).watch((settings: Settings) => emit('settings', settings))
    // noinspection JSIgnoredPromiseFromCall
    get(GameWatcher).watch((verifiedGames: Array<VerifiedGame>) => emit('games', verifiedGames))

    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (windows.mainWindow) {
            if (windows.mainWindow.isMinimized()) windows.mainWindow.restore()
            windows.mainWindow.focus()
        }
        // the commandLine is array of strings in which last element is deep link url
        // the url str ends with /
        // dialog.showErrorBox('Welcome Back', `You arrived from: ${commandLine.pop().slice(0, -1)}`)
    })

    // Quit when all windows are closed, except on macOS. There, it's common
    // for applications and their menu bar to stay active until the user quits
    // explicitly with Cmd + Q.
    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit()
        }
    })

    app.on('activate', () => {
        // On OS X it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow()
        }
    })

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.whenReady().then(() => {
        get(SettingsRepository).restore()
            .then((settings: Settings) => {
                const appLaunchWatcher = new AppLaunchWatcher(settings)
                appLaunchWatcher.watch(() => createWindowIfNotExists())

                console.log('Settings initialized launching apps...', settings)
                createBrowserSourceWindow(settings)
                createWindowIfNotExists()
            })
    })

    // In this section you can include the rest of your app's specific main process
    // code. You can also put them in separate files and import them here.
    registerCoreHandlers()
    registerDesktopHandlers()
    registerObsWebSocketHandlers()
    registerSoftwareHandlers()
    registerAuthHandlers()

    // start json-rpc server
    useRpcServer()
}