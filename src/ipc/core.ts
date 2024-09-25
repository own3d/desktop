import { app, ipcMain, screen, session } from 'electron'
import path from 'path'
import { SettingsRepository } from '../settings'
import { GameWatcher } from '../game-watcher'
import { Argv, Windows } from '../main'
import { useContainer } from '../composables/useContainer'
import IpcMainInvokeEvent = Electron.IpcMainInvokeEvent

export function registerCoreHandlers() {
    const {get} = useContainer()
    const settingsRepository = get(SettingsRepository)
    const gameWatcher = get(GameWatcher)
    const windows = get<Windows>('windows')
    const argv = get<Argv>('argv')

    ipcMain.handle('games', async () => gameWatcher.getGames())
    ipcMain.handle('version', async () => app.getVersion())
    ipcMain.handle('settings', async () => settingsRepository.getSettings())
    ipcMain.handle('needs-devtools', async () => !!argv.devtools)
    ipcMain.handle('hostname', async () => {
        return !!argv.localhost ? 'http://localhost:3000' : (argv.hostname || 'https://www.own3d.pro')
    })
    ipcMain.handle('preload', function () {
        return path.join(__dirname, 'preload.js')
    })
    ipcMain.handle('clear-cache', async () => {
        await session.defaultSession.clearStorageData()
        await session.defaultSession.clearCache()
        // await settingsRepository.logout()
        windows.mainWindow.reload()
        windows.browserSource.reload()
    })
    ipcMain.handle('toggle-overlay', async () => {
        const settings = settingsRepository.getSettings()
        const isDisabled = !settings.overlay_disabled

        if (isDisabled) {
            windows.browserSource.minimize()
        } else {
            windows.browserSource.restore()
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
            windows.browserSource.setBounds(settings.display.bounds)
        } else {
            console.log('No display settings found, using default')
            const display = screen.getDisplayNearestPoint({x: 0, y: 0})
            windows.browserSource.setBounds(display.bounds)
        }
    })
}