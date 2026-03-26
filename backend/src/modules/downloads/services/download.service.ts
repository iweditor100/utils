import { getPrisma } from "../../../prisma/client";
import { zipQueue } from "../queue/zip.queue";

export const createDownloadJob = async ({
    userId,
    fileKeys,
}: {
    userId?: string;
    fileKeys: string[];
}) => {
    const prisma = getPrisma();

    const job = await prisma.downloadJob.create({
        data: {
            userId: userId ?? "anonymous",
            fileIds: fileKeys,
            status: "QUEUED",
        },
    });

    await zipQueue.add("zip-job", {
        jobId: job.id,
        userId: userId ?? "anonymous",
        fileKeys,
    }, {
        // Prevent one user from queuing more than 3 active ZIP jobs at a time.
        // Jobs beyond this limit are rejected by BullMQ before they enter the queue.
        jobId: `zip:${userId ?? "anonymous"}:${job.id}`,
        removeOnComplete: true,
        removeOnFail: 3,
    });

    return job;
};

export const getDownloadJob = async (jobId: string) => {
    const prisma = getPrisma();
    return prisma.downloadJob.findUnique({
        where: { id: jobId },
    });
};
