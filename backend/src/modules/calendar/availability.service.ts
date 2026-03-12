import { getPrisma } from "../../prisma/client";
import { AvailabilitySlotInput } from "./availability.types";

const prisma = getPrisma();

export class AvailabilityService {
    static async getAvailability(userId: string) {
        const [slots, offDays] = await Promise.all([
            prisma.userAvailability.findMany({
                where: { userId },
                orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            }),
            prisma.userOffDay.findMany({
                where: { userId },
                orderBy: { date: "asc" },
            }),
        ]);
        return { slots, offDays };
    }

    static async updateSchedule(userId: string, slots: AvailabilitySlotInput[]) {
        await prisma.$transaction([
            prisma.userAvailability.deleteMany({ where: { userId } }),
            prisma.userAvailability.createMany({
                data: slots.map((s) => ({
                    userId,
                    dayOfWeek: s.dayOfWeek,
                    startTime: s.startTime,
                    endTime: s.endTime,
                })),
            }),
        ]);
        return prisma.userAvailability.findMany({
            where: { userId },
            orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        });
    }

    static async addOffDay(userId: string, date: string, reason?: string) {
        return prisma.userOffDay.create({
            data: {
                userId,
                date: new Date(date),
                reason,
            },
        });
    }

    static async getSlotsForDate(userId: string, dateStr: string) {
        const date = new Date(dateStr + "T00:00:00.000Z");
        const dayOfWeek = date.getUTCDay(); // 0=Sunday, 6=Saturday

        const [slots, offDay] = await Promise.all([
            prisma.userAvailability.findMany({
                where: { userId, dayOfWeek },
                orderBy: { startTime: "asc" },
            }),
            prisma.userOffDay.findFirst({
                where: { userId, date },
            }),
        ]);

        return {
            date: dateStr,
            dayOfWeek,
            isOffDay: !!offDay,
            offDayReason: offDay?.reason ?? null,
            slots: offDay ? [] : slots,
        };
    }

    static async removeOffDay(userId: string, date: string) {
        const d = new Date(date);
        const existing = await prisma.userOffDay.findFirst({
            where: { userId, date: d },
        });
        if (!existing) return null;
        return prisma.userOffDay.delete({ where: { id: existing.id } });
    }
}
