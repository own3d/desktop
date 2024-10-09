import path from 'path'
import Store from 'electron-store'
import { BrowserWindow, BrowserWindowConstructorOptions, shell } from 'electron'
import { Argv, Windows } from '../main'
import { useContainer } from '../composables/useContainer'

export function createMainWindow() {
    const {get} = useContainer()
    const config = get(Store)
    const windows = get<Windows>('windows')
    const argv = get<Argv>('argv')

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
    windows.mainWindow = new BrowserWindow(opts)

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        // noinspection JSIgnoredPromiseFromCall
        windows.mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL)
    } else {
        // noinspection JSIgnoredPromiseFromCall
        windows.mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`))
    }

    // Open the DevTools.
    if (argv.devtools) {
        windows.mainWindow.webContents.openDevTools()
    }

    windows.mainWindow.on('page-title-updated', (evt) => {
        evt.preventDefault()
    })

    windows.mainWindow.on('close', () => {
        config.set('winBounds', windows.mainWindow.getBounds())
    })

    // handle external urls
    windows.mainWindow.webContents.setWindowOpenHandler(({url}) => {
        // noinspection JSIgnoredPromiseFromCall
        shell.openExternal(url)
        return {action: 'deny'}
    })
}