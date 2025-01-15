import electron, { ipcMain } from 'electron'
import { Authorization } from '../schema'
import { io } from 'socket.io-client'
import { Button, useButton } from '../composables/useButton'
import { SettingsRepository } from '../settings'
import { useContainer } from '../composables/useContainer'
import axios from 'axios'
import { useOauth2 } from '../composables/useOauth2'
import { Windows } from '../main'
import log from 'electron-log/main';

export function registerAuthHandlers() {
    const {get} = useContainer()
    const {redirect} = useOauth2()
    const windows = get<Windows>('windows')
    const settingsRepository = get(SettingsRepository)
    let authorization: Authorization

    const handleAuthenticated = async (authorization: Authorization) => {
        log.log('Authenticated:', {
            name: authorization.data.name,
            id: authorization.data.id,
        })
        axios.defaults.headers.common['Authorization'] = authorization.token
        await settingsRepository.commitSettings({
            room: `90a951d1-ea50-4fda-8c4d-275b81f7d219.own3d.${authorization.data.id}`,
        })
        log.log(`Starting socket client for ${authorization.data.name}...`)

        // Connect to the socket
        const socket = io('https://socket-hel1-1.own3d.dev', {
            withCredentials: true,
            extraHeaders: {
                Cookie: 'serverid=socket-edge-hel1-2',
            },
        })

        // Join a room for the current user
        socket.on('connect', () => {
            log.log(`Connected to socket server, id: ${socket.id}`)
            socket.emit('auth', authorization.data.jwt_tokens.socket)
        })

        // Listen for events
        socket.on('button-click', (button: Button) => {
            log.log('Got click event:', button)
            useButton(button)
        })
    }

    ipcMain.on('authenticate', async (_event, ...args): Promise<void> => {
        const isFreshlyAuthenticated = !authorization
        authorization = args[0] as Authorization
        if (isFreshlyAuthenticated) {
            try {
                await handleAuthenticated(authorization)
            } catch (e) {
                log.log('Error while authenticating:', e)
            }
        }
    })

    const isAuthorized = (url: string) => {
        return [
            'https://id-canary.ingress.hel1.k8s.stream.tv/login',
            'https://id.stream.tv/login',
            'http://localhost:5173/',
        ].includes(url)
    }

    ipcMain.handle('magic-login', async (event) => {
        const origin = event.sender.getURL()
        if (!isAuthorized(origin)) {
            return Promise.reject(`The URL ${origin} is not authorized`)
        }
        return redirect()
    })

    ipcMain.on('logout', async () => {
        await settingsRepository.logout()
        authorization = null
        await electron.session.defaultSession.clearStorageData();
        await electron.session.defaultSession.clearCache();
        windows.mainWindow.reload();
        windows.browserSource.reload();
    })
}