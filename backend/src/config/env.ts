import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["production", "development", "test"]),
  PORT: z.coerce.number().int().positive(),

  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  // Frontend
  FRONTEND_ORIGIN: z.string().url(),

  // Auth
  ACCESS_TOKEN_SECRET: z.string().min(32),
  REFRESH_TOKEN_SECRET: z.string().min(32),

  // REDIS config
  REDIS_HOST: z.string().min(1, "REDIS_HOST is required"),
  REDIS_PORT: z.coerce.number().int().positive(),

  // ===== R2 CONFIG (FINAL) =====
  R2_ACCOUNT_ID: z.string().min(1, "R2_ACCOUNT_ID is required"),

  R2_ACCESS_KEY_ID: z.string().min(1, "R2_ACCESS_KEY_ID is required"),
  R2_SECRET_ACCESS_KEY: z.string().min(1, "R2_SECRET_ACCESS_KEY is required"),

  R2_BUCKET: z.string().min(1, "R2_BUCKET is required"),

  R2_PUBLIC_BASE_URL: z
    .string()
    .url("R2_PUBLIC_BASE_URL must be a valid URL"),

  R2_PRESIGN_EXPIRES_IN_SECONDS: z
    .coerce
    .number()
    .int()
    .positive()
    .default(300),

  // Worker /enqueue URL. Backend only enqueues key; no image processing.
  IMAGE_QUEUE_INGESTION_URL: z.string().url().optional(),


  GOOGLE_WEBHOOK_URL: z.string().url().optional(),
});


const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Invalid environment variables:\n",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;
