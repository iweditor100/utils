export type EventCategory =
    | "PRIMARY"
    | "SUCCESS"
    | "WARNING"
    | "DANGER";

export interface CreateCalendarEventInput {
    title: string;
    start: string;
    end: string;
    category: EventCategory;
    timezone: string;
}

export interface CalendarEventCreateData {
    title: string;
    startAt: Date;
    endAt: Date;
    category: EventCategory;
    timezone: string;
}

export interface CalendarEventUpdateData {
    title: string;
    startAt: Date;
    endAt: Date;
    category: EventCategory;
    timezone: string;
}
