import { createApi } from "@reduxjs/toolkit/query/react";
import type { ApiSuccess } from "../../types/api";
import type {
    LoginResponse,
    RefreshResponse,
    SessionResponse,
    LoginWithEmailInput,
    RegisterWithEmailInput,
    VerifyEmailInput,
    ForgotPasswordInput,
    ResetPasswordInput,
    ChangePasswordInput,
} from "./types";
import { setCredentials, setAccessToken, clearCredentials } from "./authSlice";
import { baseQueryWithReauth } from "../../shared/api/baseQuery";

export const authApi = createApi({
    reducerPath: 'authApi',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['Auth'],
    endpoints: (builder) => ({
        // Login with email
        loginWithEmail: builder.mutation<
            ApiSuccess<LoginResponse>,
            LoginWithEmailInput
        >({
            query: (body) => ({
                url: "/auth/login",
                method: "POST",
                data: body,
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    // Backend returns: { status: "success", statusCode, message, data: { accessToken, user } }
                    dispatch(setCredentials({
                        accessToken: data.data.accessToken,
                        user: data.data.user,
                    }));
                } catch {
                    // Error handled by UI
                }
            },
        }),

        // Login with Google
        loginWithGoogle: builder.mutation<
            ApiSuccess<LoginResponse> | LoginResponse,
            { idToken: string }
        >({
            query: (body) => ({
                url: '/auth/google',
                method: 'POST',
                data: body,
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    // Google login may return plain JSON or wrapped format
                    // Handle both cases
                    if ('status' in data && data.status === 'success') {
                        // Wrapped format
                        dispatch(setCredentials({
                            accessToken: data.data.accessToken,
                            user: data.data.user,
                        }));
                    } else if ('accessToken' in data && 'user' in data) {
                        // Plain format (legacy)
                        dispatch(setCredentials({
                            accessToken: data.accessToken,
                            user: data.user,
                        }));
                    }
                } catch {
                    // Error handled by UI
                }
            },
        }),

        // Register (does NOT log in)
        registerWithEmail: builder.mutation<
            ApiSuccess<{ message: string }>,
            RegisterWithEmailInput
        >({
            query: (body) => ({
                url: "/auth/register",
                method: "POST",
                data: body,
            }),
            // NO onQueryStarted - register does NOT authenticate
        }),

        // Refresh token
        refreshToken: builder.mutation<
            ApiSuccess<RefreshResponse>,
            void
        >({
            query: () => ({
                url: '/auth/refresh',
                method: 'POST',
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    // Backend returns: { status: "success", statusCode, message, data: { accessToken } }
                    dispatch(setAccessToken(data.data.accessToken));
                } catch {
                    // Refresh failed - will be handled by baseQuery
                }
            },
        }),

        // Get current user
        getMe: builder.query<ApiSuccess<SessionResponse>, void>({
            query: () => ({
                url: '/auth/me',
                method: 'GET',
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    const { data } = await queryFulfilled;
                    // Backend returns: { status: "success", statusCode, message, data: { user } }
                    // Only update user, keep existing accessToken
                    dispatch(setCredentials({ user: data.data.user }));
                } catch {
                    // If getMe fails, clear auth (user is not authenticated)
                    dispatch(clearCredentials());
                }
            },
        }),

        // Logout
        logout: builder.mutation<ApiSuccess<void>, void>({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    dispatch(clearCredentials());
                } catch {
                    // Even if logout fails, clear local state
                    dispatch(clearCredentials());
                }
            },
        }),

        // Verify email (does NOT log in)
        verifyEmail: builder.mutation<
            ApiSuccess<{ message: string }>,
            VerifyEmailInput
        >({
            query: ({ token }) => ({
                url: '/auth/verify-email',
                method: 'GET',
                params: { token },
            }),
            // NO onQueryStarted - verification does NOT authenticate
        }),

        // Forgot password
        forgotPassword: builder.mutation<
            ApiSuccess<{ message: string }>,
            ForgotPasswordInput
        >({
            query: (body) => ({
                url: '/auth/forgot-password',
                method: 'POST',
                data: body,
            }),
        }),

        // Reset password
        resetPassword: builder.mutation<
            ApiSuccess<{ message: string }>,
            ResetPasswordInput
        >({
            query: (body) => ({
                url: '/auth/reset-password',
                method: 'POST',
                data: body,
            }),
        }),

        // Change password (requires auth)
        changePassword: builder.mutation<
            ApiSuccess<{ message: string }>,
            ChangePasswordInput
        >({
            query: (body) => ({
                url: '/auth/change-password',
                method: 'POST',
                data: body,
            }),
        }),
    }),
});

export const {
    useLoginWithEmailMutation,
    useLoginWithGoogleMutation,
    useRegisterWithEmailMutation,
    useRefreshTokenMutation,
    useGetMeQuery,
    useLogoutMutation,
    useVerifyEmailMutation,
    useForgotPasswordMutation,
    useResetPasswordMutation,
    useChangePasswordMutation,
} = authApi;
