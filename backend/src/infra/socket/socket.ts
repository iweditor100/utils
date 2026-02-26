import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export function initSocketServer(httpServer: HttpServer) {
    io = new Server(httpServer, {
        cors: {
            origin: process.env.FRONTEND_ORIGIN,
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        const userId = socket.handshake.auth?.userId;

        if (!userId) {
            socket.disconnect();
            return;
        }

        socket.join(`user:${userId}`);
    });
}

export function getIO(): Server {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
}
