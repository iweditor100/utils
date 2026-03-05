export const USER_CODES = {
    /* ========= SUCCESS (20xxx) ========= */
    USER_UPDATE_SUCCESS: 20010,
    AVATAR_PRESIGN_SUCCESS: 20011,
    USER_SETTINGS_FETCHED: 20012,
    USER_SETTINGS_UPDATED: 20013,

    /* ========= CLIENT ERRORS (40xxx) ========= */
    USER_UPDATE_FAILED: 40010,
    AVATAR_VALIDATION_FAILED: 40011,
    USER_SETTINGS_INVALID: 40012,
} as const;

export type UserCode = typeof USER_CODES[keyof typeof USER_CODES];
