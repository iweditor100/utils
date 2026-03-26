import { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../app/store";
import { socket } from "../lib/socket";

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const user = useSelector((state: RootState) => state.auth.user);
    const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

    useEffect(() => {
        if (isAuthenticated && user?.id) {
            socket.auth = { userId: user.id };
            socket.connect();
        } else {
            socket.disconnect();
        }

        return () => {
            socket.disconnect();
        };
    }, [isAuthenticated, user?.id]);

    return <>{children}</>;
}
