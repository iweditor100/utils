import type { User } from '../../types/common';

// AuthState MUST match requirements exactly
export interface AuthState {
    user: User | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isInitialized: boolean;
}

export interface LoginResponse {
    accessToken: string;
    user: User;
}

export interface RefreshResponse {
    accessToken: string;
}

export interface SessionResponse {
    user: User;
}

export interface SetCredentialsPayload {
    user?: User;
    accessToken?: string;
}

export type LoginWithEmailInput = {
    email: string;
    password: string;
}

export type RegisterWithEmailInput = {
    name: string;
    email: string;
    password: string;
}

export type VerifyEmailInput = {
    token: string;
}

export type ForgotPasswordInput = {
    email: string;
}

export type ResetPasswordInput = {
    token: string;
    newPassword: string;
}

export type ChangePasswordInput = {
    currentPassword: string;
    newPassword: string;
}