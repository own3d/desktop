import {app, BrowserWindow, ipcMain} from 'electron';
import path from 'path';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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
    icon: path.join(__dirname, '/../images/icon.png'),
    webPreferences: {
      webviewTag: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

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
    console.log('authenticate', args)
  })

  ipcMain.handle('preload-path', function () {
    return path.join(__dirname, 'webview-preload.js');
  })
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

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
