export interface AvailabilitySlotInput {
    dayOfWeek: number; // 0 = Sunday, 6 = Saturday
    startTime: string; // "HH:MM"
    endTime: string;   // "HH:MM"
}

export interface UpdateScheduleBody {
    slots: AvailabilitySlotInput[];
}

export interface AddOffDayBody {
    date: string;    // "YYYY-MM-DD"
    reason?: string;
}
