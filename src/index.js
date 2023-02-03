const AutoLaunch = require('auto-launch');
const {app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const path = require('path');
const Config = require('electron-config')
const config = new Config();

// auto updater
require('update-electron-app')()

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
    app.quit();
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
        title: 'OWN3D Desktop',
        frame: false,
        //width: 1280 + 400,
        width: 1280,
        height: 720,
        maximizable: true,
        minimizable: true,
        backgroundColor: '#0d1114',
        icon: path.join(__dirname, '/../images/icon.png'),
        webPreferences: {
            webviewTag: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    };
    Object.assign(opts, config.get('winBounds'));
    mainWindow = new BrowserWindow(opts);

    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    // Open the DevTools.
    // mainWindow.webContents.openDevTools();

    mainWindow.on('page-title-updated', (evt) => {
        evt.preventDefault();
    });

    mainWindow.on('close', () => {
        config.set('winBounds', mainWindow.getBounds())
    });

    ipcMain.on("maximize-window", function (event) {
        mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    });

    ipcMain.on("minimize-window", function (event) {
        mainWindow.minimize()
    });

    ipcMain.on("close-window", function (event) {
        mainWindow.close()
    });
};

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
