import { io } from 'socket.io-client'
import { JSONRPCClient } from 'json-rpc-2.0'

const socket = io('http://localhost:41466')

const rpcClient = new JSONRPCClient((jsonRPCRequest) =>
    new Promise((resolve) => {
        socket.emit('json-rpc', jsonRPCRequest)
        socket.on('json-rpc', (response) => {
            rpcClient.receive(response)
        })
        resolve()
    }),
)

socket.on('connect', async () => {
    console.log('Connected to RPC server')
    const token = await rpcClient.request('oauth2@authorize')
    console.log('Token:', token)
})