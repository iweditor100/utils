import { Navigate } from "react-router-dom";
import { useAppSelector } from "../../../app/hooks";
import { selectIsAuthenticated, selectIsInitialized } from "../authSelectors";

interface RequireGuestProps {
    children: React.ReactNode;
}

/**
 * Guard component that requires guest (unauthenticated) state.
 * Redirects to home if authenticated.
 * Shows nothing until auth is initialized.
 */
export const RequireGuest = ({ children }: RequireGuestProps) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const isInitialized = useAppSelector(selectIsInitialized);

    // Wait for auth initialization
    if (!isInitialized) {
        return null; // Or a loading spinner
    }

    // Redirect to home if authenticated
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};
