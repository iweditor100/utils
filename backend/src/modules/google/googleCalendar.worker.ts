import cron from "node-cron";
import { getPrisma } from "../../prisma/client";
import { GoogleCalendarSyncService } from "./googleCalendar.sync.service";
import { createChildLogger } from "../../logger";

const log = createChildLogger("google-sync-worker");
const prisma = getPrisma();

export const startGoogleSyncWorker = () => {
    // Run every 6 hours
    cron.schedule("0 */6 * * *", async () => {
        log.info("Checking for expiring Google Calendar webhook channels");

        const now = BigInt(Date.now());
        const oneHour = BigInt(60 * 60 * 1000);
        const threshold = now + oneHour;

        const expiringIntegrations = await prisma.googleCalendarIntegration.findMany({
            where: {
                isSyncEnabled: true,
                webhookChannelId: { not: null },
                webhookExpiration: {
                    lt: threshold
                }
            }
        });

        for (const integration of expiringIntegrations) {
            try {
                log.info({ userId: integration.userId }, "Renewing webhook channel");
                await GoogleCalendarSyncService.renewWatchChannel(integration.userId);
            } catch (error) {
                log.error({ err: error, userId: integration.userId }, "Failed to renew webhook channel");
            }
        }
    });

    log.info("Google sync worker started");
};
