import { ipcMain } from 'electron'
import { Authorization } from '../schema'
import { io } from 'socket.io-client'
import { Button, useButton } from '../composables/useButton'
import { SettingsRepository } from '../settings'
import { useContainer } from '../composables/useContainer'

export function registerAuthHandlers() {
    const {get} = useContainer()
    const settingsRepository = get(SettingsRepository)
    let authorization: Authorization

    const handleAuthenticated = async (authorization: Authorization) => {
        console.log('Authenticated:', {
            name: authorization.data.name,
            id: authorization.data.id,
        })
        await settingsRepository.commitSettings({
            room: `90a951d1-ea50-4fda-8c4d-275b81f7d219.own3d.${authorization.data.id}`,
        })
        console.log(`Starting socket client for ${authorization.data.name}...`)

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
            socket.emit('auth', authorization.data.jwt_tokens.socket)
        })

        // Listen for events
        socket.on('button-click', (button: Button) => {
            console.log('Got click event:', button)
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
                console.log('Error while authenticating:', e)
            }
        }
    })
}