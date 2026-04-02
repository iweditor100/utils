import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import { verifyAccessToken } from "../../modules/auth/utils/accessToken";
import { createChildLogger } from "../../logger";

const log = createChildLogger("socket");

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

    // GLOBAL AUTH MIDDLEWARE FOR SOCKET.
    io.use((socket, next) => {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("Unauthorized: No token found"));
        }

        try {
            const payload = verifyAccessToken(token);

            // trust only this token, no other token.
            socket.data.userId = payload.userId;

            next();
        } catch {
            return next(new Error("Invalid token found by the socket"));
        }
    });



    // connection handler:
    io.on("connection", (socket) => {
        const userId = socket.data.userId;

        // safety check
        if (!userId) {
            socket.disconnect();
            return;
        }

        // safely join the room.
        socket.join(`user:${userId}`);

        log.info({ userId }, "User connected to socket");

        socket.on("disconnect", () => {
            log.info({ userId }, "User disconnected from socket");
        });
    });
}

export function getIO(): Server {
    if (!io) {
        throw new Error("Socket.io not initialized");
    }
    return io;
}
