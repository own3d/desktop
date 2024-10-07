import {createServer} from "http";
import {Server} from "socket.io";
import {JSONRPCServer} from "json-rpc-2.0";

export function useRpcServer() {
    const rpcServer = new JSONRPCServer();
    const httpServer = createServer();
    const io = new Server(httpServer, {
        // options
    });

    io.on("connection", (socket) => {
        console.log("Client connected");

        socket.on("json-rpc", (message) => {
            rpcServer.receive(message).then((response) => {
                if (response) {
                    socket.emit("json-rpc", response);
                } else {
                    console.log("This was a notification");
                }
            })
        });
    });

    rpcServer.addMethod("echo", ({text}) => text);
    rpcServer.addMethod("log", ({message}) => console.log(message));

    httpServer.listen(41466);
    console.log("RPC server listening on port 41466");

    return {
        rpcServer
    }
}