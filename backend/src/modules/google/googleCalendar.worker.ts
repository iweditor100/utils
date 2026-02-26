import cron from "node-cron";
import { getPrisma } from "../../prisma/client";
import { GoogleCalendarSyncService } from "./googleCalendar.sync.service";

const prisma = getPrisma();

export const startGoogleSyncWorker = () => {
    // Run every 6 hours
    cron.schedule("*/10 * * * * *", async () => {
        console.log("[GoogleSyncWorker] Checking for expiring channels...");

        // const now = BigInt(Date.now());
        // const oneHour = BigInt(60 * 60 * 1000);
        // const threshold = now + oneHour;

        // const expiringIntegrations = await prisma.googleCalendarIntegration.findMany({
        //     where: {
        //         isSyncEnabled: true,
        //         webhookChannelId: { not: null },
        //         webhookExpiration: {
        //             lt: threshold
        //         }
        //     }
        // });

        // for (const integration of expiringIntegrations) {
        //     try {
        //         console.log(`[GoogleSyncWorker] Renewing channel for user ${integration.userId}`);
        //         await GoogleCalendarSyncService.renewWatchChannel(integration.userId);
        //     } catch (error) {
        //         console.error(`[GoogleSyncWorker] Failed to renew channel for user ${integration.userId}`, error);
        //     }
        // }
    });

    console.log("[GoogleSyncWorker] Worker started.");
};
