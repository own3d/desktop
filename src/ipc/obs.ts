import { ipcMain, Notification } from 'electron'
import { discoverObsWebsocketCredentials, getAppData } from '../helpers'
import OBSWebSocket, { EventSubscription } from 'obs-websocket-js'
import { SettingsRepository } from '../settings'
import { useContainer } from '../composables/useContainer'
import fs from 'fs'
import { useCache } from '../composables/useCache'
import path from 'path'

export function registerObsWebSocketHandlers() {
    const {get} = useContainer()
    const settingsRepository = get(SettingsRepository)
    const obs = get(OBSWebSocket)

    let obsConnected = false
    obs.on('ConnectionOpened', () => {
        obsConnected = true
        new Notification({
            title: 'OBS Studio connected',
            body: 'You are now connected to OBS Studio.',
        }).show()
    })

    obs.on('ConnectionClosed', () => {
        if (obsConnected) {
            new Notification({
                title: 'OBS Studio disconnected',
                body: 'The connection to OBS Studio has been lost.',
            }).show()
        }
        obsConnected = false
    })

    obs.on('ConnectionError', () => {
        if (obsConnected) {
            new Notification({
                title: 'OBS Studio connection error',
                body: 'An error occurred while trying to connect to OBS Studio.',
            }).show()
        }
        obsConnected = false
    })

    obs.on('Hello', () => {
        console.log('Hello')
    })

    obs.on('Identified', () => {
        console.log('Identified')
    })

    const handleOwn3dVendorRequest = async (requestType: string, requestData: unknown) => {
        console.log('Own3d vendor request:', requestType, requestData)

        switch (requestType) {
            case 'CreateSceneTransition':
                return await handleCreateSceneTransition(requestData)
            default:
                return Promise.reject(`Unknown Own3d vendor request type: ${requestType}`)
        }
    }

    const handleCreateSceneTransition = async (requestData: {
        id: string
        name: string
        settings: {
            path: string
            transition_point: number
        }
    }): Promise<void> => {
        const tempSceneCollectionName = 'Temporary'
        const scenesDirectory = path.join(getAppData(), 'obs-studio', 'basic', 'scenes')

        // Step 1: Get the current scene collection name
        const {
            currentSceneCollectionName,
            sceneCollections,
        } = await obs.call('GetSceneCollectionList')

        if (!currentSceneCollectionName || currentSceneCollectionName === tempSceneCollectionName) {
            return Promise.reject('Could not get current scene collection name')
        }

        const sceneFiles = fs.readdirSync(scenesDirectory)
        // find json file with the same name as the current scene collection name (which is defined inside the json file)
        const sceneFile = sceneFiles.map((file) => {
            const filePath = path.join(scenesDirectory, file)
            const fileContents = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
            return {filePath, fileContents}
        }).find(({fileContents}) => fileContents.name === currentSceneCollectionName) as {
            filePath: string
            fileContents: {
                transitions: {
                    name: string
                    id: string
                    settings: {
                        path: string
                        transition_point: number
                    }
                }[]
            },
        } | undefined

        if (!sceneFile) {
            return Promise.reject(`Could not find scene file for scene collection: ${currentSceneCollectionName}`)
        }

        // Step 2: Create a temporary scene collection
        if (!sceneCollections.includes(tempSceneCollectionName)) {
            await obs.call('CreateSceneCollection', {
                sceneCollectionName: tempSceneCollectionName,
            })
        } else {
            await obs.call('SetCurrentSceneCollection', {
                sceneCollectionName: tempSceneCollectionName,
            })
        }

        try {
            // Step 3: Cache the asset and modify the scene file
            const {path} = await useCache().cacheAsset(requestData.settings.path)
            requestData.settings.path = path
            sceneFile.fileContents.transitions.push(requestData)
            fs.writeFileSync(sceneFile.filePath, JSON.stringify(sceneFile.fileContents, null, 2))
            // eslint-disable-next-line no-useless-catch
        } catch (e) {
            return Promise.reject(e)
        } finally {
            // Step 4: Restore the original scene collection
            await obs.call('SetCurrentSceneCollection', {
                sceneCollectionName: currentSceneCollectionName,
            })
        }
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
        return obsConnected
    })
    ipcMain.handle('obs:connect', async (): Promise<void> => {
        let {obs: obsSettings} = settingsRepository.getSettings()
        if (!obsSettings) obsSettings = {url: 'auto', password: 'auto'}
        const {url, password} = obsSettings
        if (url === 'auto' || password === 'auto') {
            const credentials = discoverObsWebsocketCredentials()
            if (!credentials) {
                return Promise.reject('Could not discover OBS WebSocket credentials')
            }
            const {ServerEnabled, ServerPort, ServerPassword} = credentials
            if (!ServerEnabled) {
                return Promise.reject('OBS WebSocket server not enabled')
            }
            try {
                return obs.connect(`ws://localhost:${ServerPort}`, ServerPassword, {
                    rpcVersion: 1,
                    eventSubscriptions: EventSubscription.All | EventSubscription.InputVolumeMeters,
                })
            } catch (e) {
                return Promise.reject('Could not connect to OBS WebSocket server')
            }
        }

        try {
            return obs.connect(url, password, {
                rpcVersion: 1,
                eventSubscriptions: EventSubscription.All | EventSubscription.InputVolumeMeters,
            })
        } catch (e) {
            return Promise.reject('Could not connect to OBS WebSocket server')
        }
    })
    ipcMain.handle('obs:disconnect', async (): Promise<void> => {
        return await obs.disconnect()
    })
    ipcMain.handle('obs:call', async (_event, ...args): Promise<void> => {
        // intercept OWN3D vendor requests
        if (args[0] === 'CallVendorRequest') {
            const {vendorName, requestType, requestData} = args[1]
            if (vendorName === 'OWN3D') {
                return handleOwn3dVendorRequest(requestType, requestData)
            }
        }

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return await obs.call(...args)
    })
    ipcMain.handle('obs:call-batch', async (_event, ...args): Promise<void> => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        return await obs.callBatch(...args)
    })
}