/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
import Config from 'electron-config'
import electronSquirrelStartup from 'electron-squirrel-startup'
import { app, BrowserWindow, globalShortcut, ipcMain, Notification, screen, session, shell } from 'electron'
import path from 'path'
import { Button, useButton } from './composables/useButton'

import { io } from 'socket.io-client'
import { updateElectronApp } from 'update-electron-app'
import { Authorization, Settings, VerifiedGame } from './schema'
import { GameWatcher } from './game-watcher'
import { emit } from './helpers'
import { SettingsRepository } from './settings'
import { AppLaunchWatcher } from './watch'
import { EventSubscription } from 'obs-websocket-js'

const {default: OBSWebSocket} = require('obs-websocket-js')
import BrowserWindowConstructorOptions = Electron.BrowserWindowConstructorOptions
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent

const argv: {
    _: string[]
    devtools?: boolean
    localhost?: boolean
    hostname?: string
} = require('boring')({})

updateElectronApp()

let mainWindow: BrowserWindow
let browserSource: BrowserWindow
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
    app.quit()
} else {
    const settingsRepository = new SettingsRepository()
    const gameWatcher = new GameWatcher()
    const config = new Config()
    const accelerator = 'CommandOrControl+Shift'
    let locked = true
    let forwarding = false

    // add emitters for settings and games (used in preload.ts)
    settingsRepository.watch((settings: Settings) => emit('settings', settings))
    // noinspection JSIgnoredPromiseFromCall
    gameWatcher.watch((verifiedGames: Array<VerifiedGame>) => emit('games', verifiedGames))

    // IPC events (used in preload.ts)
    // Here we listen for events from the renderer process
    ipcMain.handle('games', async () => gameWatcher.getGames())
    ipcMain.handle('version', async () => app.getVersion())
    ipcMain.handle('settings', async () => settingsRepository.getSettings())
    ipcMain.handle('quit', async () => app.quit())
    ipcMain.handle('needs-devtools', async () => !!argv.devtools)
    ipcMain.handle('hostname', async () => {
        return !!argv.localhost ? 'http://localhost:3000' : (argv.hostname || 'https://www.own3d.pro')
    })
    ipcMain.on('maximize-window', function () {
        console.log('maximize-window')
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
    })
    ipcMain.on('minimize-window', function () {
        console.log('minimize-window')
        mainWindow.minimize()
    })
    ipcMain.on('close-window', function () {
        console.log('close-window')
        mainWindow.close()
        app.quit()
    })
    ipcMain.handle('preload', function () {
        return path.join(__dirname, 'preload.js')
    })
    ipcMain.handle('clear-cache', async () => {
        await session.defaultSession.clearStorageData()
        await session.defaultSession.clearCache()
        // await settingsRepository.logout()
        mainWindow.reload()
        browserSource.reload()
    })
    ipcMain.handle('toggle-overlay', async () => {
        const settings = settingsRepository.getSettings()
        const isDisabled = !settings.overlay_disabled

        if (isDisabled) {
            browserSource.minimize()
        } else {
            browserSource.restore()
        }

        await settingsRepository.commitSettings({
            overlay_disabled: isDisabled,
            overlay_muted: isDisabled,
        })
    })
    ipcMain.handle('toggle-overlay-audio', async () => {
        const settings = settingsRepository.getSettings()

        await settingsRepository.commitSettings({
            overlay_muted: !settings.overlay_muted,
        })
    })
    ipcMain.handle('commit-settings',
        async (_event: IpcMainInvokeEvent, ...args: any[]) => settingsRepository.commitSettings(args[0]),
    )
    ipcMain.handle('get-displays', async () => screen.getAllDisplays())
    ipcMain.handle('request-display-update', async () => {
        const settings = settingsRepository.getSettings()

        if (settings.display) {
            console.log('Display settings found, using display', settings.display)
            browserSource.setBounds(settings.display.bounds)
        } else {
            console.log('No display settings found, using default')
            const display = screen.getDisplayNearestPoint({x: 0, y: 0})
            browserSource.setBounds(display.bounds)
        }
    })

    const obs = new OBSWebSocket()
    let obsConnected: boolean = false

    const handleObsDisconnect = () => {
        if (obsConnected) {
            new Notification({
                title: 'OBS Studio disconnected',
                body: 'The connection to OBS Studio has been lost.',
            }).show()
        }
        obsConnected = false
    }

    ipcMain.handle('obs:credentials', async (_event, ...args): Promise<void> => {
        return settingsRepository.commitSettings({
            obs: {
                url: args[0],
                password: args[1],
            },
        })
    })
    ipcMain.handle('obs:connected', async (): Promise<boolean> => {
        try {
            await obs.call('GetStreamStatus')
        } catch (e) {
            handleObsDisconnect()
        }
        return obsConnected
    })
    ipcMain.handle('obs:connect', async (): Promise<any> => {
        const {url, password} = settingsRepository.getSettings().obs
        return await obs.connect(url, password, {
            rpcVersion: 1,
            eventSubscriptions: EventSubscription.All | EventSubscription.InputVolumeMeters,
        }).then((response: any) => {
            obsConnected = true
            return response
        })
    })
    ipcMain.handle('obs:disconnect', async (): Promise<void> => {
        return await obs.disconnect().then(() => {
            handleObsDisconnect()
        })
    })
    ipcMain.handle('obs:call', async (_event, ...args): Promise<void> => {
        return await obs.call(...args)
    })
    ipcMain.handle('obs:call-batch', async (_event, ...args): Promise<void> => {
        return await obs.callBatch(...args)
    })

    // patching the emit function to forward events to the renderer process
    const oldEmit = obs.emit
    obs.emit = function () {
        emit(`obs:${arguments[0]}`, ...arguments)
        oldEmit.apply(obs, arguments)
    }

    ipcMain.on('authenticate', async (_event, ...args): Promise<void> => {
        const isFreshlyAuthenticated = !authorization
        authorization = args[0] as Authorization
        if (isFreshlyAuthenticated) {
            try {
                await handleAuthenticated(authorization)
            } catch (e) {
                console.log('Error while authenticating:', e)
            }
        }
    })

    // Handle creating/removing shortcuts on Windows when installing/uninstalling.
    if (electronSquirrelStartup) {
        app.quit()
    }

    app.on('second-instance', () => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore()
            mainWindow.focus()
        }
        // the commandLine is array of strings in which last element is deep link url
        // the url str ends with /
        // dialog.showErrorBox('Welcome Back', `You arrived from: ${commandLine.pop().slice(0, -1)}`)
    })

    // This method will be called when Electron has finished
    // initialization and is ready to create browser windows.
    // Some APIs can only be used after this event occurs.
    app.whenReady().then(() => {
        settingsRepository.restore()
            .then((settings: Settings) => {
                const appLaunchWatcher = new AppLaunchWatcher(settings)
                appLaunchWatcher.watch(() => createWindowIfNotExists())

                console.log('Settings initialized launching apps...', settings)
                createBrowserSource(settings)
                createWindowIfNotExists()
            })
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
            createWindow()
        }
    })


    // In this section you can include the rest of your app's specific main process
    // code. You can also put them in separate files and import them here.
    let authorization: Authorization

    const handleAuthenticated = async (authorization: Authorization) => {
        console.log('Authenticated:', {
            name: authorization.data.name,
            id: authorization.data.id,
        })
        await settingsRepository.commitSettings({
            room: `90a951d1-ea50-4fda-8c4d-275b81f7d219.own3d.${authorization.data.id}`,
        })
        console.log(`Starting socket client for ${authorization.data.name}...`)

        // Connect to the socket
        const socket = io('https://socket-hel1-1.own3d.dev', {
            withCredentials: true,
            extraHeaders: {
                Cookie: 'serverid=socket-edge-hel1-2',
            },
        })

        // Join a room for the current user
        socket.on('connect', () => {
            console.log(`Connected to socket server, id: ${socket.id}`)
            socket.emit('auth', authorization.data.jwt_tokens.socket)
        })

        // Listen for events
        socket.on('button-click', (button: Button) => {
            console.log('Got click event:', button)
            useButton(button)
        })
    }

    const createWindow = () => {
        // Create the browser window.
        const opts = {
            title: 'OWN3D Pro Desktop',
            frame: false,
            //width: 1280 + 400,
            width: 1280,
            height: 720,
            minWidth: 950,
            minHeight: 500,
            maximizable: true,
            minimizable: true,
            backgroundColor: '#0d1114',
            webPreferences: {
                webviewTag: true,
                preload: path.join(__dirname, 'preload.js'),
            },
        } as BrowserWindowConstructorOptions
        Object.assign(opts, config.get('winBounds'))
        mainWindow = new BrowserWindow(opts)

        // and load the index.html of the app.
        if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
            // noinspection JSIgnoredPromiseFromCall
            mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
        } else {
            // noinspection JSIgnoredPromiseFromCall
            mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
        }

        // Open the DevTools.
        if (argv.devtools) {
            mainWindow.webContents.openDevTools()
        }

        mainWindow.on('page-title-updated', (evt) => {
            evt.preventDefault()
        })

        mainWindow.on('close', () => {
            config.set('winBounds', mainWindow.getBounds())
        })

        // handle external urls
        mainWindow.webContents.setWindowOpenHandler(({url}) => {
            // noinspection JSIgnoredPromiseFromCall
            shell.openExternal(url)
            return {action: 'deny'}
        })
    }

    const forwardMouseEvents = (lock: boolean, forwarding: boolean) => {
        console.log('forwardMouseEvents',
            lock ? 'Locked' : 'Unlocked',
            forwarding ? 'Forward' : 'Not forwarding',
        )
        browserSource.setIgnoreMouseEvents(lock, {forward: forwarding})
    }

    const createBrowserSource = (settings: Settings) => {
        const options = {
            acceptFirstMouse: true,
            alwaysOnTop: true, // true on prod
            backgroundColor: '#00FFFFFF',
            closable: true,
            frame: false, // false on prod
            fullscreenable: true,
            fullscreen: true, // true on prod
            hasShadow: false,
            maximizable: false,
            minimizable: false,
            movable: true,
            resizable: false, // false on prod
            skipTaskbar: true,  // true on prod
            titleBarStyle: 'customButtonsOnHover',
            transparent: true,
            useContentSize: true, // true on prod
            width: 1920 / 2,
            height: 1080 / 2,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
            },
        } as BrowserWindowConstructorOptions

        if (settings.display) {
            console.log('Display settings found, using display', settings.display)
            options.x = settings.display.bounds.x
            options.y = settings.display.bounds.y
            options.width = settings.display.bounds.width
            options.height = settings.display.bounds.height
        }

        // Create the browser window.
        browserSource = new BrowserWindow(options)

        // Enables staying on fullscreen apps for macOS https://github.com/electron/electron/pull/11599
        browserSource.setFullScreenable(false)

        // VisibleOnFullscreen removed in https://github.com/electron/electron/pull/21706
        browserSource.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true})

        // Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
        browserSource.setAlwaysOnTop(true, 'screen-saver')

        // disable interaction with the window
        browserSource.setIgnoreMouseEvents(locked)

        // and load the index.html of the app.
        if (FULLSCREEN_WINDOW_VITE_DEV_SERVER_URL) {
            // noinspection JSIgnoredPromiseFromCall
            browserSource.loadURL(`${FULLSCREEN_WINDOW_VITE_DEV_SERVER_URL}/fullscreen.html`)
        } else {
            // noinspection JSIgnoredPromiseFromCall
            browserSource.loadFile(path.join(__dirname, `../renderer/${FULLSCREEN_WINDOW_VITE_NAME}/fullscreen.html`))
        }

        // Open the DevTools.
        // browserSource.webContents.openDevTools()

        globalShortcut.register(`${accelerator}+O`, () => {
            // exit the app
            app.quit()
        })

        globalShortcut.register(`${accelerator}+F`, () => {
            // toggle lock
            forwarding = !forwarding
            forwardMouseEvents(locked, forwarding)
        })

        // debug only
        // globalShortcut.register(`${accelerator}+X`, () => {
        //     // toggle lock
        //     locked = !locked;
        //     forwardMouseEvents(locked, forwarding)
        // })

        if (settings.overlay_disabled) {
            browserSource.minimize()
        }

        // capture all console.log from the browser source and forward them to the main process
        browserSource.webContents.on('console-message', (_event, _level, message) => {
            console.log('BrowserSource:', message)
        })
    }

    const createWindowIfNotExists = () => {
        // check if the window is not already open, ignore all alwaysOnTop windows
        const windows = BrowserWindow.getAllWindows().filter((window: any) => !window.isAlwaysOnTop())
        if (windows.length === 0) {
            createWindow()
        }
    }
}