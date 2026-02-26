import axios, { type InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import type { RootState } from "../app/store";

// Store reference to get state (will be set by store)
let getState: (() => RootState) | null = null;

export const setAxiosStateGetter = (getter: () => RootState) => {
    getState = getter;
};

export const axiosClient = axios.create({
    baseURL: env.API_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    },
});

// Request interceptor: attach accessToken if it exists
axiosClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (getState) {
            const state = getState();
            const accessToken = state.auth.accessToken;
            if (accessToken && config.headers) {
                config.headers.Authorization = `Bearer ${accessToken}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);