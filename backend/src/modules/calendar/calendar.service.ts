import { getPrisma } from "../../prisma/client";
import { CalendarEventCreateData } from "./calendar.types";
import { createChildLogger } from "../../logger";

const log = createChildLogger("calendar");

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


        log.info({ userId, eventId: event.id }, "Calendar event created");

        // Sync to Google if enabled (fires socket itself when done)
        const { GoogleCalendarSyncService } = await import("../google/googleCalendar.sync.service");
        await GoogleCalendarSyncService.pushLocalEvent(event.id);

        // Always emit so the UI updates even when Google sync is off
        const { getIO } = await import("../../infra/socket/socket");
        getIO().to(`user:${userId}`).emit("calendar:updated");

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

        // Always emit so the UI updates even when Google sync is off
        const { getIO } = await import("../../infra/socket/socket");
        getIO().to(`user:${userId}`).emit("calendar:updated");

        return updated;
    }


    static async deleteAllEvents(userId: string) {
        const result = await prisma.calendarEvent.deleteMany({ where: { userId } });
        return result.count;
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

        const deleted = await prisma.calendarEvent.delete({
            where: { id: eventId }
        });

        // Always emit after DB delete so frontend refetch sees the event already gone
        const { getIO } = await import("../../infra/socket/socket");
        getIO().to(`user:${userId}`).emit("calendar:updated");

        return deleted;
    }
}