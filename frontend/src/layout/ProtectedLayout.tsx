import AppLayout from "./AppLayout";

/**
 * ProtectedLayout wraps authenticated routes.
 * Auth checking is handled by RequireAuth guard.
 */
export const ProtectedLayout = () => {
    return <AppLayout />;
};
