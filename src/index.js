const AutoLaunch = require('auto-launch')
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron')
const path = require('path')
const Config = require('electron-config')
const config = new Config()
const io = require('socket.io-client')
const { handleButton } = require('./button-handler.js')

// auto updater
require('update-electron-app')({
    repo: 'own3d/desktop',
})

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit()
}

const gotTheLock = app.requestSingleInstanceLock()
let mainWindow

if (!gotTheLock) {
    app.quit()
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
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
        let autoLaunch = new AutoLaunch({
            name: 'OWN3D',
            path: app.getPath('exe'),
        })

        autoLaunch.isEnabled().then((isEnabled) => {
            if (!isEnabled) autoLaunch.enable()
        })

        createWindow()
    })
}

const createWindow = () => {
    // Create the browser window.
    let opts = {
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
        icon: path.join(__dirname, '/../icons/icon.png'),
        webPreferences: {
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    }
    Object.assign(opts, config.get('winBounds'))
    mainWindow = new BrowserWindow(opts)

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'))

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    mainWindow.on('page-title-updated', (evt) => {
        evt.preventDefault()
    })

    mainWindow.on('close', () => {
        config.set('winBounds', mainWindow.getBounds())
    })

    ipcMain.on('maximize-window', function (event) {
        console.log('maximize-window')
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize()
    })

    ipcMain.on('minimize-window', function (event) {
        console.log('minimize-window')
        mainWindow.minimize()
    })

    ipcMain.on('close-window', function (event) {
        console.log('close-window')
        mainWindow.close()
    })

    ipcMain.on('authenticate', function (event, ...args) {
        const isFreshlyAuthenticated = !authorization
        authorization = args[0]
        if (isFreshlyAuthenticated) {
            try {
                handleAuthenticated(authorization)
            } catch (e) {
                console.log('Error while authenticating:', e)
            }
        }
    })
}

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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
let authorization

const handleAuthenticated = ({ data, locale, token }) => {
    console.log(data)
    console.log(`Starting socket client for ${data.name}...`)

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
        socket.emit('auth', data.jwt_tokens.socket)
    })

// Listen for events
    socket.on('button-click', (button) => {
        console.log('Got click event:', button)
        handleButton(button)
    })
}
