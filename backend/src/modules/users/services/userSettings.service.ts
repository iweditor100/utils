import { getPrisma } from "../../../prisma/client";

export interface SettingsMeta {
    phone?: string;
    bio?: string;
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
        country?: string;
    };
    social?: {
        twitter?: string;
        linkedin?: string;
        github?: string;
        website?: string;
    };
}

const prisma = getPrisma();

export class UserSettingsService {
    static async getSettings(userId: string) {
        const setting = await prisma.userSetting.findUnique({ where: { userId } });
        return (setting?.meta ?? {}) as SettingsMeta;
    }

    static async updateSettings(userId: string, updates: SettingsMeta) {
        const existing = await prisma.userSetting.findUnique({ where: { userId } });
        const currentMeta = (existing?.meta ?? {}) as SettingsMeta;

        const newMeta: SettingsMeta = {
            ...currentMeta,
            ...updates,
            address: { ...currentMeta.address, ...updates.address },
            social: { ...currentMeta.social, ...updates.social },
        };

        const setting = await prisma.userSetting.upsert({
            where: { userId },
            create: { userId, meta: newMeta },
            update: { meta: newMeta },
        });

        return setting.meta as SettingsMeta;
    }
}
