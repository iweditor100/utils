import { title } from "process";
import { getPrisma } from "../../prisma/client";
import { CalendarEventCreateData } from "./calendar.types";

const prisma = getPrisma();


export class CalendarService {
    static async getUserEvents(userId: string) {
        return prisma.calendarEvent.findMany({
            where: { userId },
            orderBy: { startAt: "asc" }
        })
    }


    static async createEvent(userId: string, data: CalendarEventCreateData) {
        const event = await prisma.calendarEvent.create({
            data: {
                userId,
                title: data.title,
                startAt: data.startAt,
                endAt: data.endAt,
                category: data.category,
                timeZone: data.timezone,
                lastModifiedSource: "LOCAL",
            },
        });

        // Sync to Google
        const { GoogleCalendarSyncService } = await import("../google/googleCalendar.sync.service");
        // Fire and forget - do not await to keep UI snappy, or await if strict consistency needed.
        // Requirement says "immediate", usually implies async task but we can await for safety.
        // Implementation guidelines say "await GoogleCalendarSyncService.pushLocalEvent(event.id)"
        await GoogleCalendarSyncService.pushLocalEvent(event.id);

        return event;
    }

    static async updateEvent(
        userId: string,
        id: string,
        data: CalendarEventCreateData
    ) {
        const existing = await prisma.calendarEvent.findFirst({
            where: { id, userId },
        });

        if (!existing) return null;

        const updated = await prisma.calendarEvent.update({
            where: { id },
            data: {
                title: data.title,
                startAt: data.startAt,
                endAt: data.endAt,
                category: data.category,
                timeZone: data.timezone,
                lastModifiedSource: "LOCAL",
            }
        });

        const { GoogleCalendarSyncService } = await import("../google/googleCalendar.sync.service");
        await GoogleCalendarSyncService.pushLocalEvent(updated.id);

        return updated;
    }


    static async deleteEvent(userId: string, eventId: string) {
        const existing = await prisma.calendarEvent.findFirst({
            where: { id: eventId, userId },
        })

        if (!existing) return null;

        const { GoogleCalendarSyncService } = await import("../google/googleCalendar.sync.service");
        if (existing.googleEventId) {
            await GoogleCalendarSyncService.deleteLocalEventFromGoogle(existing.id, userId, existing.googleEventId);
        }

        return prisma.calendarEvent.delete({
            where: { id: eventId }
        })
    }
}