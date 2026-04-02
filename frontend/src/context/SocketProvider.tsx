import { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";
import { socket } from "../lib/socket";

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
    const accessToken = useSelector((state: RootState) => state.auth.accessToken);

    useEffect(() => {
        if (isAuthenticated && accessToken) {
            socket.auth = { token: accessToken };
            socket.connect();
        } else {
            socket.disconnect();
        }

        return () => {
            socket.disconnect();
        };
    }, [isAuthenticated, accessToken]);

    return <>{children}</>;
}
