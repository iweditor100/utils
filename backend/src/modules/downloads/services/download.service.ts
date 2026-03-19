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
        fileKeys,
    });

    return job;
};

export const getDownloadJob = async (jobId: string) => {
    const prisma = getPrisma();
    return prisma.downloadJob.findUnique({
        where: { id: jobId },
    });
};
