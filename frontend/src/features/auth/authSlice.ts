import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthState, SetCredentialsPayload } from './types';

const initialState: AuthState = {
    user: null,
    accessToken: null,
    isAuthenticated: false,
    isInitialized: false,
};

export const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (
            state,
            action: PayloadAction<SetCredentialsPayload>
        ) => {
            if (action.payload.user !== undefined) {
                state.user = action.payload.user;
            }
            if (action.payload.accessToken !== undefined) {
                state.accessToken = action.payload.accessToken;
            }
            // isAuthenticated is true if we have both user and accessToken
            state.isAuthenticated = !!(state.user && state.accessToken);
            state.isInitialized = true;
        },
        setAccessToken: (state, action: PayloadAction<string | null>) => {
            state.accessToken = action.payload;
            // Update isAuthenticated based on current state
            state.isAuthenticated = !!(state.user && state.accessToken);
        },
        clearCredentials: (state) => {
            state.user = null;
            state.accessToken = null;
            state.isAuthenticated = false;
            state.isInitialized = true;
        },
        setInitialized: (state, action: PayloadAction<boolean>) => {
            state.isInitialized = action.payload;
        },
    },
});

export const { setCredentials, setAccessToken, clearCredentials, setInitialized } = authSlice.actions;

export default authSlice.reducer;