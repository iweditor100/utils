import { Server } from "socket.io";
import { Server as HttpServer } from "http";

let io: Server;

export function initSocketServer(httpServer: HttpServer) {
    const allowedOrigins = (process.env.FRONTEND_ORIGIN ?? "")
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);

    io = new Server(httpServer, {
        cors: {
            origin: allowedOrigins,
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
