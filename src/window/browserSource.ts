import { useContainer } from '../composables/useContainer'
import path from 'path'
import { app, BrowserWindow, BrowserWindowConstructorOptions, globalShortcut } from 'electron'
import { Windows } from '../main'
import { Settings } from '../schema'

export function createBrowserSourceWindow(
    settings: Settings,
) {
    const {get} = useContainer()
    const windows = get<Windows>('windows')

    const accelerator = 'CommandOrControl+Shift'
    let locked = true
    let forwarding = false

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
    windows.browserSource = new BrowserWindow(options)

    // Enables staying on fullscreen apps for macOS https://github.com/electron/electron/pull/11599
    windows.browserSource.setFullScreenable(false)

    // VisibleOnFullscreen removed in https://github.com/electron/electron/pull/21706
    windows.browserSource.setVisibleOnAllWorkspaces(true, {visibleOnFullScreen: true})

    // Values include normal, floating, torn-off-menu, modal-panel, main-menu, status, pop-up-menu, screen-saver
    windows.browserSource.setAlwaysOnTop(true, 'screen-saver')

    // disable interaction with the window
    windows.browserSource.setIgnoreMouseEvents(locked)

    // and load the index.html of the app.
    if (FULLSCREEN_WINDOW_VITE_DEV_SERVER_URL) {
        // noinspection JSIgnoredPromiseFromCall
        windows.browserSource.loadURL(`${FULLSCREEN_WINDOW_VITE_DEV_SERVER_URL}/fullscreen.html`)
    } else {
        // noinspection JSIgnoredPromiseFromCall
        windows.browserSource.loadFile(path.join(__dirname, `../renderer/${FULLSCREEN_WINDOW_VITE_NAME}/fullscreen.html`))
    }

    // Open the DevTools.
    // windows.browserSource.webContents.openDevTools()

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
        windows.browserSource.minimize()
    }

    // capture all console.log from the browser source and forward them to the main process
    windows.browserSource.webContents.on('console-message', (_event, _level, message) => {
        console.log('BrowserSource:', message)
    })

    const forwardMouseEvents = (lock: boolean, forwarding: boolean) => {
        console.log('forwardMouseEvents',
            lock ? 'Locked' : 'Unlocked',
            forwarding ? 'Forward' : 'Not forwarding',
        )
        windows.browserSource.setIgnoreMouseEvents(lock, {forward: forwarding})
    }
}