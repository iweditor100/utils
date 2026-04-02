import { google, calendar_v3 } from "googleapis";
import { getPrisma } from "../../prisma/client";
import { GoogleCalendarService } from "./googleCalendar.service";
import { v4 as uuidv4 } from "uuid";
import { EventCategory, SyncSource } from "@prisma/client";
import { getIO } from "../../infra/socket/socket";
import { env } from "../../config/env";
import { GOOGLE_CALENDAR_CODES } from "../../constants/googleCalendar.codes";
import crypto from "crypto";
import { createChildLogger } from "../../logger";

const log = createChildLogger("google-sync");


const prisma = getPrisma();

export class GoogleCalendarSyncService {

    // ==========================================
    // LOCAL -> GOOGLE
    // ==========================================

    static async pushLocalEvent(eventId: string): Promise<void> {


        const event = await prisma.calendarEvent.findUnique({ where: { id: eventId } });
        if (!event) return;




        // LOOP PREVENTION: If the last modification came from Google, do not push back.
        if (event.lastModifiedSource === SyncSource.GOOGLE) {
            return;
        }

        const integration = await prisma.googleCalendarIntegration.findUnique({
            where: { userId: event.userId }
        });


        if (!integration || !integration.isSyncEnabled) {
            return;
        }

        try {
            const client = await GoogleCalendarService.getAuthorizedClient(event.userId);
            const calendar = google.calendar({ version: 'v3', auth: client });

            const resource: calendar_v3.Schema$Event = {
                summary: event.title,
                description: event.description || undefined,
                location: event.location || undefined,
            };

            if (event.allDay) {
                resource.start = { date: event.startAt.toISOString().split('T')[0] };
                resource.end = { date: event.endAt.toISOString().split('T')[0] };
            } else {
                resource.start = { dateTime: event.startAt.toISOString(), timeZone: event.timeZone };
                resource.end = { dateTime: event.endAt.toISOString(), timeZone: event.timeZone };
            }

            let googleEventId = event.googleEventId;
            let googleEtag = event.googleEtag;
            let googleHtmlLink = event.googleHtmlLink;

            if (googleEventId) {
                // Update existing event
                try {
                    const res = await calendar.events.update({
                        calendarId: 'primary',
                        eventId: googleEventId,
                        requestBody: resource,
                    });
                    googleEtag = res.data.etag || null;
                    googleHtmlLink = res.data.htmlLink || null;
                } catch (err: any) {
                    if (err.code === 404) {
                        // Event deleted on Google side, recreate it
                        googleEventId = null;
                    } else {
                        throw err;
                    }
                }
            }

            if (!googleEventId) {
                // Insert new event
                const res = await calendar.events.insert({
                    calendarId: 'primary',
                    requestBody: resource,
                });
                googleEventId = res.data.id || null;
                googleEtag = res.data.etag || null;
                googleHtmlLink = res.data.htmlLink || null;
            }

            // Update local metadata WITHOUT changing lastModifiedSource (it remains LOCAL)
            if (googleEventId) {
                await prisma.calendarEvent.update({
                    where: { id: eventId },
                    data: {
                        googleEventId,
                        googleEtag,
                        googleHtmlLink,
                        lastSyncedAt: new Date(),
                    }
                });
                const io = getIO();
                io.to(`user:${event.userId}`).emit("calendar:updated");
            }

        } catch (error) {
            log.error({ err: error, eventId }, "Failed to push event to Google");
        }
    }

    static async deleteLocalEventFromGoogle(eventId: string, userId: string, googleEventId: string | null): Promise<void> {
        if (!googleEventId) return;

        const integration = await prisma.googleCalendarIntegration.findUnique({
            where: { userId }
        });

        if (!integration || !integration.isSyncEnabled) return;

        try {
            const client = await GoogleCalendarService.getAuthorizedClient(userId);
            const calendar = google.calendar({ version: 'v3', auth: client });

            await calendar.events.delete({
                calendarId: 'primary',
                eventId: googleEventId,
            });


        } catch (error: any) {
            if (error.code !== 404 && error.code !== 410) {
                log.error({ err: error, googleEventId, userId }, "Failed to delete event from Google");
            }
        }
    }

    // ==========================================
    // GOOGLE -> LOCAL (SYNC & WEBHOOK)
    // ==========================================

    static async fullInitialSync(userId: string): Promise<void> {
        try {
            const client = await GoogleCalendarService.getAuthorizedClient(userId);
            const calendar = google.calendar({ version: 'v3', auth: client });

            let pageToken: string | undefined;

            do {
                const res = await calendar.events.list({
                    calendarId: 'primary',
                    singleEvents: true,
                    showDeleted: true,
                    pageToken,
                    orderBy: 'startTime',
                });

                const events = res.data.items || [];

                for (const googleEvent of events) {
                    if (googleEvent.status === 'cancelled') {
                        if (googleEvent.id) {
                            await prisma.calendarEvent.deleteMany({
                                where: { googleEventId: googleEvent.id }
                            });
                        }
                    } else {
                        await this.upsertGoogleEventToLocal(userId, googleEvent);
                    }
                }

                pageToken = res.data.nextPageToken || undefined;

                if (res.data.nextSyncToken) {
                    await prisma.googleCalendarIntegration.update({
                        where: { userId },
                        data: { syncToken: res.data.nextSyncToken }
                    });
                }

            } while (pageToken);

            // Emit once after full sync completes
            const io = getIO();
            io.to(`user:${userId}`).emit("calendar:updated");

        } catch (error: any) {
            log.error({ err: error, userId }, "Full initial sync failed");
            throw error;
        }
    }

    static async pullRemoteChanges(userId: string): Promise<void> {
        const integration = await prisma.googleCalendarIntegration.findUnique({
            where: { userId }
        });

        if (!integration || !integration.isSyncEnabled) return;

        if (!integration.syncToken) {
            return this.fullInitialSync(userId);
        }

        try {
            const client = await GoogleCalendarService.getAuthorizedClient(userId);
            const calendar = google.calendar({ version: 'v3', auth: client });

            let pageToken: string | undefined;
            let hasChanges = false;

            do {
                const res = await calendar.events.list({
                    calendarId: 'primary',
                    syncToken: integration.syncToken,
                    showDeleted: true,
                    pageToken,
                });

                const events = res.data.items || [];

                for (const googleEvent of events) {
                    if (googleEvent.status === 'cancelled') {
                        if (googleEvent.id) {
                            await prisma.calendarEvent.deleteMany({
                                where: { googleEventId: googleEvent.id }
                            });
                            hasChanges = true;
                        }
                    } else {
                        await this.upsertGoogleEventToLocal(userId, googleEvent);
                        hasChanges = true;
                    }
                }

                pageToken = res.data.nextPageToken || undefined;

                if (res.data.nextSyncToken) {
                    await prisma.googleCalendarIntegration.update({
                        where: { userId },
                        data: { syncToken: res.data.nextSyncToken }
                    });
                }

            } while (pageToken);

            // Emit once after processing all changes
            if (hasChanges) {
                const io = getIO();
                io.to(`user:${userId}`).emit("calendar:updated");
            }

        } catch (error: any) {
            if (error.code === 410) {
                // Sync token invalid, do full sync
                log.warn({ userId }, "Sync token expired, invalidating and performing full sync");
                await prisma.googleCalendarIntegration.update({
                    where: { userId },
                    data: { syncToken: null }
                });
                return this.fullInitialSync(userId);
            }
            log.error({ err: error, userId }, "Pull remote changes failed");
        }
    }

    private static async upsertGoogleEventToLocal(userId: string, googleEvent: calendar_v3.Schema$Event) {
        if (!googleEvent.id) return;

        const existing = await prisma.calendarEvent.findUnique({
            where: { googleEventId: googleEvent.id }
        });

        const start = googleEvent.start;
        const end = googleEvent.end;

        if (!start || !end) return; // Should not happen for valid events

        const isAllDay = !start.dateTime && !!start.date;
        const startAt = start.dateTime ? new Date(start.dateTime) : new Date(start.date + "T00:00:00Z");
        const endAt = end.dateTime ? new Date(end.dateTime) : new Date(end.date + "T00:00:00Z");
        const timeZone = start.timeZone || "UTC";

        // CONFLICT RESOLUTION:
        // If local event exists, check updated time.
        // Google event 'updated' field is datetime string.

        if (existing) {
            const googleUpdated = googleEvent.updated ? new Date(googleEvent.updated) : new Date();

            // If Google version is NOT newer than our local update, skip.
            // However, be careful: if we just pushed to Google, googleUpdated might be new.
            // But we used lastModifiedSource to prevent loops.
            // If we are here, it means Google *told* us there is a change.
            // Trust Google's 'updated' timestamp vs local 'updatedAt'.

            if (existing.updatedAt > googleUpdated) {
                // Local is newer (or we just pushed it), ignore this echo
                return;
            }
        }

        await prisma.calendarEvent.upsert({
            where: { googleEventId: googleEvent.id },
            update: {
                title: googleEvent.summary || "(No Title)",
                description: googleEvent.description || undefined,
                location: googleEvent.location || undefined,
                startAt,
                endAt,
                allDay: isAllDay,
                timeZone,
                googleEtag: googleEvent.etag,
                googleHtmlLink: googleEvent.htmlLink,
                lastModifiedSource: SyncSource.GOOGLE, // MARK AS GOOGLE
                lastSyncedAt: new Date(),
            },
            create: {
                userId,
                title: googleEvent.summary || "(No Title)",
                description: googleEvent.description || undefined,
                location: googleEvent.location || undefined,
                // Default category
                category: EventCategory.PRIMARY,
                startAt,
                endAt,
                allDay: isAllDay,
                timeZone,
                googleEventId: googleEvent.id,
                googleEtag: googleEvent.etag,
                googleHtmlLink: googleEvent.htmlLink,
                lastModifiedSource: SyncSource.GOOGLE, // MARK AS GOOGLE
                lastSyncedAt: new Date(),
            }
        });
    }

    // ==========================================
    // CHANNEL & TOGGLE
    // ==========================================

    static async toggleSync(userId: string, enabled: boolean): Promise<void> {
        if (enabled) {
            await prisma.googleCalendarIntegration.update({
                where: { userId },
                data: { isSyncEnabled: true }
            });
            try {
                await this.fullInitialSync(userId);
                await this.createWatchChannel(userId);
            } catch (error: any) {
                // Roll back — don't leave sync marked enabled if it failed
                await prisma.googleCalendarIntegration.update({
                    where: { userId },
                    data: { isSyncEnabled: false }
                });
                const isInsufficientScopes =
                    error?.status === 403 &&
                    error?.cause?.status === 'PERMISSION_DENIED';
                if (isInsufficientScopes) {
                    throw { appCode: GOOGLE_CALENDAR_CODES.GOOGLE_INSUFFICIENT_SCOPES };
                }
                throw error;
            }
        } else {
            await this.stopWatchChannel(userId);
            await prisma.googleCalendarIntegration.update({
                where: { userId },
                data: { isSyncEnabled: false }
            });
        }
    }

    static async createWatchChannel(userId: string): Promise<void> {
        const client = await GoogleCalendarService.getAuthorizedClient(userId);
        const calendar = google.calendar({ version: 'v3', auth: client });

        const channelId = uuidv4();
        const webhookUrl = env.GOOGLE_WEBHOOK_URL;

        if (!webhookUrl) {
            throw new Error("GOOGLE_WEBHOOK_URL is not defined");
        }

        // Generate a cryptographically secure random token.
        // Send raw token to Google; store only the SHA-256 hash in DB.
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

        const res = await calendar.events.watch({
            calendarId: 'primary',
            requestBody: {
                id: channelId,
                type: 'web_hook',
                address: webhookUrl,
                token: rawToken,
            }
        });

        const resourceId = res.data.resourceId;
        const expiration = res.data.expiration ? BigInt(res.data.expiration) : undefined;

        await prisma.googleCalendarIntegration.update({
            where: { userId },
            data: {
                webhookChannelId: channelId,
                webhookResourceId: resourceId,
                webhookExpiration: expiration,
                webhookTokenHash: tokenHash,
            }
        });
    }

    static async stopWatchChannel(userId: string): Promise<void> {
        const integration = await prisma.googleCalendarIntegration.findUnique({
            where: { userId }
        });

        if (!integration?.webhookChannelId || !integration?.webhookResourceId) return;

        try {
            const client = await GoogleCalendarService.getAuthorizedClient(userId);
            const calendar = google.calendar({ version: 'v3', auth: client });

            await calendar.channels.stop({
                requestBody: {
                    id: integration.webhookChannelId,
                    resourceId: integration.webhookResourceId
                }
            });
        } catch (error) {
            log.warn({ err: error, userId }, "Failed to stop watch channel (may be already expired)");
        }

        await prisma.googleCalendarIntegration.update({
            where: { userId },
            data: {
                webhookChannelId: null,
                webhookResourceId: null,
                webhookExpiration: null
            }
        });
    }

    static async renewWatchChannel(userId: string): Promise<void> {
        // Stop old one first (or just let it die, but better to stop if valid)
        await this.stopWatchChannel(userId);
        // Create new
        await this.createWatchChannel(userId);
    }
}
