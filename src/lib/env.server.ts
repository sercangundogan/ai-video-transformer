import "server-only";

import { z } from "zod";

const mongoEnvSchema = z.object({
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1).default("ai-video-transformer"),
});

const uploadcareServerEnvSchema = z.object({
  UPLOADCARE_SECRET_KEY: z.string().min(1),
});

const cloudinaryEnvSchema = z.object({
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
});

const appEnvSchema = z.object({
  APP_URL: z.url(),
});

const magicHourEnvSchema = z.object({
  MAGIC_HOUR_API_KEY: z.string().min(1),
  MAGIC_HOUR_WEBHOOK_SECRET: z.string().min(1),
});

export type MongoEnv = z.infer<typeof mongoEnvSchema>;
export type UploadcareServerEnv = z.infer<typeof uploadcareServerEnvSchema>;
export type CloudinaryEnv = z.infer<typeof cloudinaryEnvSchema>;
export type AppEnv = z.infer<typeof appEnvSchema>;
export type MagicHourEnv = z.infer<typeof magicHourEnvSchema>;

function formatEnvError(label: string, error: z.ZodError): Error {
  const details = error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");

  return new Error(`Invalid ${label} environment: ${details}`);
}

function parseOrThrow<T>(
  label: string,
  schema: z.ZodType<T>,
  value: unknown,
): T {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw formatEnvError(label, parsed.error);
  }
  return parsed.data;
}

export function getAppEnv(): AppEnv {
  return parseOrThrow("app", appEnvSchema, {
    APP_URL: process.env.APP_URL,
  });
}

export function getMongoEnv(): MongoEnv {
  return parseOrThrow("mongo", mongoEnvSchema, {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
  });
}

export function getUploadcareServerEnv(): UploadcareServerEnv {
  return parseOrThrow("uploadcare", uploadcareServerEnvSchema, {
    UPLOADCARE_SECRET_KEY: process.env.UPLOADCARE_SECRET_KEY,
  });
}

export function getCloudinaryEnv(): CloudinaryEnv {
  return parseOrThrow("cloudinary", cloudinaryEnvSchema, {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  });
}

/**
 * Required starting in Phase 3 (transform + webhook).
 */
export function getMagicHourEnv(): MagicHourEnv {
  return parseOrThrow("magic hour", magicHourEnvSchema, {
    MAGIC_HOUR_API_KEY: process.env.MAGIC_HOUR_API_KEY,
    MAGIC_HOUR_WEBHOOK_SECRET: process.env.MAGIC_HOUR_WEBHOOK_SECRET,
  });
}
