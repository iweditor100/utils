import { AUTH_CODES } from "./auth.codes";
import { USER_CODES } from "./user.codes";
import { CALENDAR_CODES } from "./calendar.codes";

export const RESPONSE_MESSAGES: Record<number, string> = {
    // -------- SUCCESS --------
    [AUTH_CODES.LOGIN_SUCCESS]: "Login successful",
    [AUTH_CODES.USER_REGISTERED]: "User registered successfully",
    [AUTH_CODES.EMAIL_VERIFICATION_SENT]: "Email verification sent",
    [AUTH_CODES.EMAIL_VERIFIED]: "Email verified successfully",
    [AUTH_CODES.PASSWORD_RESET_SENT]: "Password reset sent",
    [AUTH_CODES.PASSWORD_RESET_SUCCESS]: "Password reset successful",
    [AUTH_CODES.LOGOUT_SUCCESS]: "Logout successful",
    [USER_CODES.USER_UPDATE_SUCCESS]: "User updated successfully",
    [USER_CODES.AVATAR_PRESIGN_SUCCESS]: "Presigned upload URL generated",
    [USER_CODES.USER_SETTINGS_FETCHED]: "User settings fetched",
    [USER_CODES.USER_SETTINGS_UPDATED]: "User settings updated",
    [USER_CODES.USER_SETTINGS_INVALID]: "Invalid settings data",

    // -------- CLIENT / AUTH ERRORS --------
    [AUTH_CODES.INVALID_CREDENTIALS]: "Invalid credentials",
    [AUTH_CODES.UNAUTHORIZED]: "Unauthorized",
    [AUTH_CODES.TOKEN_EXPIRED]: "Token expired",
    [AUTH_CODES.TOKEN_INVALID]: "Token invalid",
    [AUTH_CODES.SESSION_REVOKED]: "Session revoked",
    [AUTH_CODES.EMAIL_NOT_VERIFIED]: "Email not verified",
    [AUTH_CODES.USER_NOT_FOUND]: "User not found",
    [AUTH_CODES.USER_ALREADY_EXISTS]: "User already exists",
    [AUTH_CODES.PASSWORD_WEAK]: "Password weak",
    [USER_CODES.AVATAR_VALIDATION_FAILED]: "Invalid avatar file or size",

    // -------- AVAILABILITY --------
    [CALENDAR_CODES.AVAILABILITY_FETCHED]: "Availability fetched",
    [CALENDAR_CODES.AVAILABILITY_UPDATED]: "Availability updated",
    [CALENDAR_CODES.OFF_DAY_ADDED]: "Off day added",
    [CALENDAR_CODES.OFF_DAY_REMOVED]: "Off day removed",
    [CALENDAR_CODES.OFF_DAY_NOT_FOUND]: "Off day not found",
    [CALENDAR_CODES.INVALID_AVAILABILITY_DATA]: "Invalid availability data",

    // -------- SERVER ERRORS --------
    [AUTH_CODES.AUTH_INTERNAL_ERROR]: "Auth internal error",
    [AUTH_CODES.TOKEN_ROTATION_FAILED]: "Token rotation failed",
}