import { getPrisma } from "../../prisma/client";
import type { AnnotationData } from "./annotations.types";

const prisma = getPrisma();

export async function upsertAnnotation(uploadId: string, userId: string, data: AnnotationData) { 
    return prisma.annotation.upsert({
        where: { uploadId },
        create: { uploadId, userId, data },
        update: { data, version: { increment: 1 } },
    });
}


export async function findAnnotationByUploadId(uploadId: string) {
    return prisma.annotation.findUnique({ where : { uploadId }});    
}