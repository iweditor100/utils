import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../../../app/hooks";
import { selectIsAuthenticated, selectIsInitialized } from "../authSelectors";

interface RequireAuthProps {
    children: React.ReactNode;
}

/**
 * Guard component that requires authentication.
 * Redirects to /signin if not authenticated.
 * Shows nothing until auth is initialized.
 */
export const RequireAuth = ({ children }: RequireAuthProps) => {
    const isAuthenticated = useAppSelector(selectIsAuthenticated);
    const isInitialized = useAppSelector(selectIsInitialized);
    const location = useLocation();

    // Wait for auth initialization
    if (!isInitialized) {
        return null; // Or a loading spinner
    }

    // Redirect to signin if not authenticated, preserving intended destination
    if (!isAuthenticated) {
        return <Navigate to="/signin" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};
