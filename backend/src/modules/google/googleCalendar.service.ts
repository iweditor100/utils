import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getPrisma } from "../../prisma/client";
import { EventCategory } from "@prisma/client";
import { GOOGLE_CALENDAR_CODES } from "../../constants/googleCalendar.codes";

const prisma = getPrisma();

export class GoogleCalendarService {
    private static createOAuthClient(): OAuth2Client {
        return new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID!,
            process.env.GOOGLE_CLIENT_SECRET!,
            process.env.GOOGLE_CALENDAR_REDIRECT_URI!
        );
    }

    static generateAuthUrl(userId: string): string {
        const client = this.createOAuthClient();
        return client.generateAuthUrl({
            access_type: "offline",
            prompt: "consent", // Force refresh token
            scope: [
                "https://www.googleapis.com/auth/calendar",
                "https://www.googleapis.com/auth/userinfo.email",
            ],
            state: userId,
        });
    }

    static async handleCallback(code: string, userId: string): Promise<void> {
        const client = this.createOAuthClient();
        const { tokens } = await client.getToken(code);

        if (!tokens.refresh_token) {
            console.warn("No refresh token received during Google Auth callback");
        }

        client.setCredentials(tokens);
        const oauth2 = google.oauth2({ version: "v2", auth: client });
        const userInfo = await oauth2.userinfo.get();

        const email = userInfo.data.email || "";

        await prisma.googleCalendarIntegration.upsert({
            where: { userId },
            create: {
                userId,
                email,
                accessToken: tokens.access_token,
                refreshToken: tokens.refresh_token,
                expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
            },
            update: {
                email,
                accessToken: tokens.access_token,
                // Only update refresh token if we got a new one
                ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
                expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : null,
            },
        });
    }

    static async getAuthorizedClient(userId: string): Promise<OAuth2Client> {
        const integration = await prisma.googleCalendarIntegration.findUnique({
            where: { userId },
        });

        if (!integration) {
            throw { appCode: GOOGLE_CALENDAR_CODES.GOOGLE_NOT_CONNECTED, message: "User has no Google Calendar integration" };
        }

        const client = this.createOAuthClient();

        client.setCredentials({
            access_token: integration.accessToken,
            refresh_token: integration.refreshToken,
            expiry_date: integration.expiryDate ? Number(integration.expiryDate) : undefined,
        });

        // Listen for tokens to update DB
        client.on("tokens", async (tokens) => {
            if (tokens.refresh_token) {
                console.log("New refresh token received");
            }
            await prisma.googleCalendarIntegration.update({
                where: { userId },
                data: {
                    accessToken: tokens.access_token,
                    expiryDate: tokens.expiry_date ? BigInt(tokens.expiry_date) : undefined,
                    ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
                },
            });
        });

        return client;
    }

    static async getStatus(userId: string): Promise<{ connected: boolean; email?: string; isSyncEnabled?: boolean }> {
        const integration = await prisma.googleCalendarIntegration.findUnique({
            where: { userId },
            select: { email: true, isSyncEnabled: true },
        });

        if (!integration) {
            return { connected: false };
        }

        return { connected: true, email: integration.email, isSyncEnabled: integration.isSyncEnabled };
    }

    static async importEvents(userId: string, startDate?: Date, endDate?: Date): Promise<void> {
        const client = await this.getAuthorizedClient(userId);
        const calendar = google.calendar({
            version: "v3",
            auth: client,
        });

        // Default: 1 month ago to now when no date range provided
        const timeMin = startDate ?? (() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d; })();

        const res = await calendar.events.list({
            calendarId: "primary",
            timeMin: timeMin.toISOString(),
            ...(endDate && { timeMax: endDate.toISOString() }),
            singleEvents: true,
            orderBy: "startTime",
        });

        const events = res.data.items || [];

        for (const event of events) {
            if (!event.id || !event.start || !event.end) continue;

            const isAllDay = !event.start.dateTime && !!event.start.date;

            // Safe date parsing
            const startAt = event.start.dateTime
                ? new Date(event.start.dateTime)
                : new Date(event.start.date + "T00:00:00Z"); // Force UTC for all-day to avoid offset issues

            const endAt = event.end.dateTime
                ? new Date(event.end.dateTime)
                : new Date(event.end.date + "T00:00:00Z");


            const timeZone = event.start.timeZone || "UTC";

            await prisma.calendarEvent.upsert({
                where: { googleEventId: event.id },
                update: {
                    title: event.summary || "(No Title)",
                    description: event.description || "",
                    location: event.location || "",
                    startAt,
                    endAt,
                    allDay: isAllDay,
                    timeZone,
                    googleEtag: event.etag,
                    googleHtmlLink: event.htmlLink,
                },
                create: {
                    userId,
                    title: event.summary || "(No Title)",
                    description: event.description || "",
                    location: event.location || "",
                    category: EventCategory.PRIMARY,
                    startAt,
                    endAt,
                    allDay: isAllDay,
                    timeZone,
                    googleEventId: event.id,
                    googleEtag: event.etag,
                    googleHtmlLink: event.htmlLink,
                },
            });
        }
    }

    static async exportEvents(userId: string, startDate?: Date, endDate?: Date): Promise<void> {
        const client = await this.getAuthorizedClient(userId);
        const calendar = google.calendar({
            version: "v3",
            auth: client,
        });

        // Find local events that are NOT yet synced, optionally filtered by date range
        const localEvents = await prisma.calendarEvent.findMany({
            where: {
                userId,
                googleEventId: null,
                ...(startDate && { startAt: { gte: startDate } }),
                ...(endDate && { endAt: { lte: endDate } }),
            },
        });

        for (const event of localEvents) {
            try {
                const resource: any = {
                    summary: event.title,
                    description: event.description || undefined,
                    location: event.location || undefined,
                };

                if (event.allDay) {
                    // Google expects YYYY-MM-DD for date
                    resource.start = { date: event.startAt.toISOString().split("T")[0] };
                    resource.end = { date: event.endAt.toISOString().split("T")[0] };
                } else {
                    resource.start = { dateTime: event.startAt.toISOString(), timeZone: event.timeZone };
                    resource.end = { dateTime: event.endAt.toISOString(), timeZone: event.timeZone };
                }

                const res = await calendar.events.insert({
                    calendarId: "primary",
                    requestBody: resource,
                });

                if (res.data.id) {
                    await prisma.calendarEvent.update({
                        where: { id: event.id },
                        data: {
                            googleEventId: res.data.id,
                            googleEtag: res.data.etag,
                            googleHtmlLink: res.data.htmlLink,
                        },
                    });
                }
            } catch (error) {
                console.error(`Failed to export event ${event.id}`, error);
                // Continue to next event
            }
        }
    }


    static async disconnect(userId: string): Promise<void> {
        const integration = await prisma.googleCalendarIntegration.findUnique({ where: { userId }});
        if (!integration) return; //no integration found. 

        // stop webhook channel first, this is using a valid token. 
        if (integration.isSyncEnabled || integration.webhookChannelId) {
            const { GoogleCalendarSyncService } = await import("./googleCalendar.sync.service");
            await GoogleCalendarSyncService.stopWatchChannel(userId);
        }



        // revoke the token on Google's side. 
        if (integration.accessToken) {
            try {
                const client = this.createOAuthClient();
                await client.revokeToken(integration.accessToken);
            } catch (err) {
                console.warn("Failed to revoke Google token (may be already expired): ", err);
            }
        }


        // delete the integration record.
        await prisma.googleCalendarIntegration.delete({ where: { userId }});
    }
}
