export const CALENDAR_CODES = {
    /* ========= SUCCESS (21xxx) ========= */
    EVENTS_FETCHED: 21001,
    EVENT_CREATED: 21002,
    EVENT_UPDATED: 21003,
    EVENT_DELETED: 21004,

    /* ========= CLIENT ERRORS (44xxx) ========= */
    EVENT_NOT_FOUND: 44001,
    INVALID_EVENT_DATA: 44002,
    UNAUTHORIZED_EVENT_ACCESS: 44003,

    /* ========= SERVER ERRORS (54xxx) ========= */
    CALENDAR_INTERNAL_ERROR: 54001,
} as const;

export type CalendarCode =
    typeof CALENDAR_CODES[keyof typeof CALENDAR_CODES];
