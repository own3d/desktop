import { ipcMain, Notification } from 'electron'
import { discoverObsWebsocketCredentials } from '../helpers'
import OBSWebSocket, { EventSubscription } from 'obs-websocket-js'
import { SettingsRepository } from '../settings'
import { useContainer } from '../composables/useContainer'

export function registerObsWebSocketHandlers() {
    const {get} = useContainer()
    const settingsRepository = get(SettingsRepository)
    const obs = get(OBSWebSocket)

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
        if (url === 'auto' || password === 'auto') {
            const {ServerEnabled, ServerPort, ServerPassword} = discoverObsWebsocketCredentials()
            if (!ServerEnabled) {
                throw new Error('OBS WebSockets plugin is not enabled')
            }

            return await obs.connect(`ws://localhost:${ServerPort}`, ServerPassword, {
                rpcVersion: 1,
                eventSubscriptions: EventSubscription.All | EventSubscription.InputVolumeMeters,
            }).then((response: any) => {
                obsConnected = true
                return response
            })
        }

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
        // @ts-ignore
        return await obs.call(...args)
    })
    ipcMain.handle('obs:call-batch', async (_event, ...args): Promise<void> => {
        // @ts-ignore
        return await obs.callBatch(...args)
    })
}