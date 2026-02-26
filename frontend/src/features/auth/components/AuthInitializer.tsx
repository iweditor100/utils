import { useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../../../app/hooks";
import { selectAccessToken, selectIsInitialized } from "../authSelectors";
import { useGetMeQuery, useRefreshTokenMutation } from "../authApi";
import { setInitialized } from "../authSlice";

/**
 * AuthInitializer handles app startup authentication flow:
 * 1. If accessToken exists → call /auth/me
 * 2. If accessToken missing → try refresh → if success, call /auth/me
 * 3. If refresh fails → user is logged out (state already cleared)
 */
export const AuthInitializer = ({ children }: { children: React.ReactNode }) => {
    const dispatch = useAppDispatch();
    const accessToken = useAppSelector(selectAccessToken);
    const isInitialized = useAppSelector(selectIsInitialized);
    const initializedRef = useRef(false);

    const [refreshToken] = useRefreshTokenMutation();
    
    // Conditionally call /auth/me only if we have accessToken
    const { isLoading: isMeLoading, isFetching: isMeFetching } = useGetMeQuery(undefined, {
        skip: !accessToken, // Skip if no accessToken
    });

    useEffect(() => {
        // Prevent multiple initializations
        if (initializedRef.current || isInitialized) {
            return;
        }

        const initializeAuth = async () => {
            initializedRef.current = true;

            if (accessToken) {
                // We have accessToken, /auth/me will be called automatically by the query
                // Just mark as initialized
                dispatch(setInitialized(true));
            } else {
                // No accessToken, try refresh
                try {
                    await refreshToken().unwrap();
                    // Refresh succeeded - accessToken is now in Redux
                    // /auth/me will be called automatically if accessToken exists
                    dispatch(setInitialized(true));
                } catch {
                    // Refresh failed - user is logged out
                    // clearCredentials was already called by refreshToken mutation
                    dispatch(setInitialized(true));
                }
            }
        };

        initializeAuth();
    }, [accessToken, isInitialized, dispatch, refreshToken]);

    // Show nothing until auth is initialized
    if (!isInitialized || (accessToken && (isMeLoading || isMeFetching))) {
        return null; // Or a loading spinner
    }

    return <>{children}</>;
};
