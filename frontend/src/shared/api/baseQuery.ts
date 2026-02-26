import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AxiosRequestConfig, AxiosError } from "axios";
import { axiosClient } from "../../services/axiosClient";

export interface AxiosBaseQueryError {
    status?: number;
    data?: unknown;
}

// Routes that should NOT trigger refresh on 401
const NO_REFRESH_ROUTES = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/google',
];

const isAuthRoute = (url: string): boolean => {
    return NO_REFRESH_ROUTES.some(route => url.includes(route));
};

// Raw axios base query
const axiosBaseQuery =
    (): BaseQueryFn<
        {
            url: string;
            method: AxiosRequestConfig['method'];
            data?: AxiosRequestConfig['data'];
            params?: AxiosRequestConfig['params'];
        },
        unknown,
        AxiosBaseQueryError
    > =>
        async ({ url, method, data, params }) => {
            try {
                const result = await axiosClient({ url, method, data, params });
                return { data: result.data };
            } catch (axiosError) {
                const err = axiosError as AxiosError;
                return {
                    error: {
                        status: err.response?.status,
                        data: err.response?.data || err.message,
                    },
                };
            }
        };

// Track if we're currently refreshing to prevent infinite loops
let isRefreshing = false;
let refreshPromise: Promise<{ success: boolean; accessToken?: string }> | null = null;

// Base query with re-auth logic
export const baseQueryWithReauth: BaseQueryFn<
    {
        url: string;
        method: AxiosRequestConfig['method'];
        data?: AxiosRequestConfig['data'];
        params?: AxiosRequestConfig['params'];
    },
    unknown,
    AxiosBaseQueryError
> = async (args, api, extraOptions) => {
    // First attempt
    let result = await axiosBaseQuery()(args, api, extraOptions);

    // Only handle 401, NOT 403
    if (result.error?.status === 401 && !isAuthRoute(args.url)) {
        // Prevent multiple simultaneous refresh calls
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = (async () => {
                try {
                    const refreshResult = await axiosClient.post('/auth/refresh');
                    // Handle both response formats
                    let accessToken: string | undefined;
                    if (refreshResult.data) {
                        const data = refreshResult.data as any;
                        if (data.status === 'success' && data.data?.accessToken) {
                            accessToken = data.data.accessToken;
                        } else if (data.accessToken) {
                            // Legacy format
                            accessToken = data.accessToken;
                        }
                    }
                    if (accessToken) {
                        // Update accessToken in Redux
                        api.dispatch({ type: 'auth/setAccessToken', payload: accessToken });
                        return { success: true, accessToken };
                    }
                    return { success: false };
                } catch {
                    // Refresh failed - clear auth and return false
                    api.dispatch({ type: 'auth/clearCredentials' });
                    return { success: false };
                } finally {
                    isRefreshing = false;
                }
            })();
        }

        // Wait for refresh to complete
        const refreshResult = await refreshPromise;

        if (refreshResult?.success) {
            // Retry original request with new accessToken
            result = await axiosBaseQuery()(args, api, extraOptions);
        }
        // If refresh failed, result.error is already set from first attempt
    }

    return result;
};
