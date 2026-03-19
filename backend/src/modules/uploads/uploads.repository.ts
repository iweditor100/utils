import { getPrisma } from "../../prisma/client";

type CreateUploadInput = {
  ownerId: string;
  key: string;
  mimeType: string;
  size: number;
  category: string;
};

// Inserts a new upload record. Caller is responsible for ensuring key is unique;
// if the key already exists (duplicate /complete call), the operation is silently
// ignored and the existing record is returned instead.
export async function createUpload(data: CreateUploadInput) {
  const prisma = getPrisma();
  return prisma.upload.upsert({
    where: { key: data.key },
    create: data,
    update: {},
  });
}

// Fetches a single upload by its DB id. Returns null if not found.
export async function findUploadById(id: string) {
  const prisma = getPrisma();
  console.log("finding the file by the fileId inthe repositry")
  return prisma.upload.findUnique({ where: { id } });
}

// Fetches all uploads owned by a user, ordered newest first.
export async function findUploadsByOwnerId(ownerId: string, page: number, limit: number) {
  const prisma = getPrisma();
  const [uploads, total] = await Promise.all([
    prisma.upload.findMany({
      where: { ownerId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.upload.count({ where: { ownerId } }),
  ]);
  return { uploads, total };
}
