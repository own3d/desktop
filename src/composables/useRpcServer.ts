import { createServer } from 'http'
import { Server } from 'socket.io'
import { JSONRPCServer } from 'json-rpc-2.0'
import axios from 'axios'
import { useOauth2 } from './useOauth2'

export async function useRpcServer() {
    const {callback} = useOauth2()
    const {
        data: allowedOrigins,
    } = await axios.get('https://assets.cdn.own3d.tv/production/desktop/allowed-origins.json')

    const rpcServer = new JSONRPCServer()
    const httpServer = createServer()
    const io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
            credentials: true,
        },
    })

    io.on('connection', (socket) => {
        socket.on('json-rpc', (message) => {
            rpcServer.receive(message).then((response) => {
                if (response) {
                    socket.emit('json-rpc', response)
                }
            })
        })
    })

    rpcServer.addMethod('echo', ({text}) => text)
    rpcServer.addMethod('log', ({message}) => console.log(message))

    rpcServer.addMethod('oauth2@callback', callback)
    rpcServer.addMethod('oauth2_callback', callback)
    rpcServer.addMethod('oauth2_logout', async () => {
        await settingsRepository.setCredentials(null)
    })

    httpServer.listen(41466)
    console.log('RPC server listening on port 41466')

    return {
        rpcServer,
    }
}