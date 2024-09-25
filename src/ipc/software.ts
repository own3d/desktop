import { ipcMain } from 'electron'
import { InstallProgress, Software, SoftwareName, useSoftware } from '../composables/useSoftware'

export function registerSoftwareHandlers() {
    const {get, install} = useSoftware()

    ipcMain.handle('software:get', async (_event, name: SoftwareName): Promise<Software> => {
        return await get(name)
    })

    ipcMain.handle('software:install', async (_event, name: SoftwareName, progressCallback: (progress: InstallProgress) => void): Promise<Software> => {
        return await install(name, progressCallback)
    })
}