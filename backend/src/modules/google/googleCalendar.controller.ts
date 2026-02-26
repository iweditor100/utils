import { Request, Response } from "express";
import { GoogleCalendarService } from "./googleCalendar.service";
import { sendError, sendSuccess } from "../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../constants";
import { GOOGLE_CALENDAR_CODES } from "../../constants/googleCalendar.codes";


export class GoogleCalendarController {

    static async connect(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
            }

            const url = GoogleCalendarService.generateAuthUrl(userId);
            return sendSuccess(res, GOOGLE_CALENDAR_CODES.GOOGLE_AUTH_URL_GENERATED, { url }, HTTP_STATUS.OK);
        } catch (error) {
            return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }


    static async callback(req: Request, res: Response) {
        try {
            const { code, state } = req.query;

            if (!code || !state) {
                return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_INVALID_CALLBACK, HTTP_STATUS.BAD_REQUEST);
            }

            // state is passed as userId in generateAuthUrl
            const userId = state as string;

            await GoogleCalendarService.handleCallback(code as string, userId);

            // Redirect to frontend on success
            // In production this should come from env but for now we assume localhost or configured URL
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4001";
            return res.redirect(`${frontendUrl}/calendar?google=connected`);

        } catch (error) {
            console.error("Google Callback Error:", error);
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4001";
            return res.redirect(`${frontendUrl}/calendar?google=error`);
        }
    }

    static async status(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
            }

            const status = await GoogleCalendarService.getStatus(userId);
            return sendSuccess(res, GOOGLE_CALENDAR_CODES.GOOGLE_CONNECTED, status, HTTP_STATUS.OK);
        } catch (error) {
            return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    static async importEvents(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
            }

            await GoogleCalendarService.importEvents(userId);

            return sendSuccess(res, GOOGLE_CALENDAR_CODES.GOOGLE_IMPORT_SUCCESS, {}, HTTP_STATUS.OK);
        } catch (error: any) {
            if (error.appCode) {
                return sendError(res, error.appCode, HTTP_STATUS.BAD_REQUEST, error.message);
            }
            return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_SYNC_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }

    static async exportEvents(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
            }

            await GoogleCalendarService.exportEvents(userId);

            return sendSuccess(res, GOOGLE_CALENDAR_CODES.GOOGLE_EXPORT_SUCCESS, {}, HTTP_STATUS.OK);
        } catch (error: any) {
            if (error.appCode) {
                return sendError(res, error.appCode, HTTP_STATUS.BAD_REQUEST, error.message);
            }
            return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_SYNC_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }
    static async toggleSync(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                console.log("Not found the user")
                return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
            }

            const { enabled } = req.body;
            if (typeof enabled !== 'boolean') {
                console.log("Not found the enabled")
                return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_INVALID_CALLBACK, HTTP_STATUS.BAD_REQUEST);
            }

            const { GoogleCalendarSyncService } = await import("./googleCalendar.sync.service");
            await GoogleCalendarSyncService.toggleSync(userId, enabled);

            return sendSuccess(res, GOOGLE_CALENDAR_CODES.GOOGLE_SYNC_COMPLETED, { enabled }, HTTP_STATUS.OK);
        } catch (error: any) {
            console.error("Toggle sync error", error);
            return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_SYNC_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    static async webhook(req: Request, res: Response) {
        // Google requires immediate 200 OK
        console.log("Webhook triggered");
        res.status(200).send("OK");

        try {
            const channelId = req.headers['x-goog-channel-id'] as string;
            const resourceId = req.headers['x-goog-resource-id'] as string;

            if (!channelId || !resourceId) return;

            // Verify token if we needed security, but x-goog-channel-id is unique enough for now if we look it up.
            // We need to find WHICH user this belongs to.
            const prisma = await import("../../prisma/client").then(m => m.getPrisma());

            const integration = await prisma.googleCalendarIntegration.findFirst({
                where: {
                    webhookChannelId: channelId,
                    webhookResourceId: resourceId
                }
            });

            if (!integration) {
                // Channel not found or mismatched
                return;
            }

            const { GoogleCalendarSyncService } = await import("./googleCalendar.sync.service");
            await GoogleCalendarSyncService.pullRemoteChanges(integration.userId);

        } catch (error) {
            console.error("Webhook processing error", error);
        }
    }
}