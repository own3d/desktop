import { app, dialog, ipcMain } from 'electron'
import { useDevice } from '../composables/useDevice'
import { Argv, Windows } from '../main'
import { useContainer } from '../composables/useContainer'
import log from 'electron-log/main'

export function registerDesktopHandlers() {
    const {get} = useContainer()
    const {getDeviceId} = useDevice()
    const windows = get<Windows>('windows')

    ipcMain.on('quit', () => () => {
        app.quit()
    })

    ipcMain.on('maximize-window', () => {
        log.log('maximize-window')
        windows.mainWindow.isMaximized() ? windows.mainWindow.unmaximize() : windows.mainWindow.maximize()
    })

    ipcMain.on('minimize-window', () => {
        log.log('minimize-window')
        windows.mainWindow.minimize()
    })

    ipcMain.on('close-window', () => {
        log.log('close-window')
        windows.mainWindow.close()
        app.quit()
    })

    ipcMain.handle('is-maximized', (): boolean => {
        return windows.mainWindow.isMaximized()
    })

    ipcMain.handle('get-device-id', async (): Promise<string> => {
        return await getDeviceId()
    })

    ipcMain.handle('open-file-dialog', async (_event, options: Electron.OpenDialogOptions = undefined) => {
        return await dialog.showOpenDialog(windows.mainWindow, options)
    })
}
