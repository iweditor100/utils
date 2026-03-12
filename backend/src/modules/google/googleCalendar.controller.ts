import { Request, Response } from "express";
import { GoogleCalendarService } from "./googleCalendar.service";
import { sendError, sendSuccess } from "../../utils";
import { AUTH_CODES, HTTP_STATUS } from "../../constants";
import { GOOGLE_CALENDAR_CODES } from "../../constants/googleCalendar.codes";
import { redis } from "../../infra/redis";


export class GoogleCalendarController {

    static async connect(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
            }

            const url = await GoogleCalendarService.generateAuthUrl(userId);
            return sendSuccess(res, GOOGLE_CALENDAR_CODES.GOOGLE_AUTH_URL_GENERATED, { url }, HTTP_STATUS.OK);
        } catch (error) {
            return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR);
        }
    }


    static async disconnect(req: Request, res: Response) {
        try {
            const userId = req.user?.userId;
            if (!userId) return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED); //found no user id,

            await GoogleCalendarService.disconnect(userId); //disconnect for this user. 
            return sendSuccess(res, GOOGLE_CALENDAR_CODES.GOOGLE_DISCONNECTED, {}, HTTP_STATUS.OK);
        } catch (error) {
            return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_INTERNAL_ERROR, HTTP_STATUS.INTERNAL_SERVER_ERROR); //some internal error was caught. 
        }
    }


    static async callback(req: Request, res: Response) {
        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:4001";
        try {
            const { code, state } = req.query;

            if (!code || !state) {
                return res.redirect(`${frontendUrl}/calendar?google=error`);
            }

            // Resolve nonce → userId from Redis (prevents state forgery)
            const userId = await redis.get(`oauth:state:${state as string}`);
            if (!userId) {
                return res.redirect(`${frontendUrl}/calendar?google=error`);
            }
            await redis.del(`oauth:state:${state as string}`);

            await GoogleCalendarService.handleCallback(code as string, userId);
            return res.redirect(`${frontendUrl}/calendar?google=connected`);

        } catch (error) {
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

            const { startDate, endDate } = req.body;
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;

            await GoogleCalendarService.importEvents(userId, start, end);

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

            const { startDate, endDate } = req.body;
            const start = startDate ? new Date(startDate) : undefined;
            const end = endDate ? new Date(endDate) : undefined;

            await GoogleCalendarService.exportEvents(userId, start, end);

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
                return sendError(res, AUTH_CODES.UNAUTHORIZED, HTTP_STATUS.UNAUTHORIZED);
            }

            const { enabled } = req.body;
            if (typeof enabled !== 'boolean') {
                return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_INVALID_CALLBACK, HTTP_STATUS.BAD_REQUEST);
            }

            const { GoogleCalendarSyncService } = await import("./googleCalendar.sync.service");
            await GoogleCalendarSyncService.toggleSync(userId, enabled);

            return sendSuccess(res, GOOGLE_CALENDAR_CODES.GOOGLE_SYNC_COMPLETED, { enabled }, HTTP_STATUS.OK);
        } catch (error: any) {
            if (error.appCode === GOOGLE_CALENDAR_CODES.GOOGLE_INSUFFICIENT_SCOPES) {
                return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_INSUFFICIENT_SCOPES, HTTP_STATUS.BAD_REQUEST);
            }
            return sendError(res, GOOGLE_CALENDAR_CODES.GOOGLE_SYNC_FAILED, HTTP_STATUS.INTERNAL_SERVER_ERROR, error.message);
        }
    }

    static async webhook(req: Request, res: Response) {
        // Google requires immediate 200 OK
        res.status(200).send("OK");

        try {
            const channelId = req.headers['x-goog-channel-id'] as string;
            const resourceId = req.headers['x-goog-resource-id'] as string;
            const resourceState = req.headers['x-goog-resource-state'] as string;
            const channelToken = req.headers['x-goog-channel-token'] as string;

            if (resourceState === 'sync') return;
            if (!channelId || !resourceId) return;

            const prisma = await import("../../prisma/client").then(m => m.getPrisma());

            const integration = await prisma.googleCalendarIntegration.findFirst({
                where: {
                    webhookChannelId: channelId,
                    webhookResourceId: resourceId
                }
            });

            if (!integration) return;

            // Verify the token Google echoes back matches the userId we set on watch creation
            if (channelToken !== integration.userId) return;

            const { GoogleCalendarSyncService } = await import("./googleCalendar.sync.service");
            await GoogleCalendarSyncService.pullRemoteChanges(integration.userId);

        } catch (error) {
            // intentionally silent — webhook errors must not affect Google retry logic
        }
    }
}