import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  APP_URL: z.url(),
  MONGODB_URI: z.string().min(1),
  MONGODB_DB_NAME: z.string().min(1).default("ai-video-transformer"),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  MAGIC_HOUR_API_KEY: z.string().min(1),
  MAGIC_HOUR_WEBHOOK_SECRET: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function formatEnvError(error: z.ZodError): Error {
  const details = error.issues
    .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("; ");

  return new Error(`Invalid server environment: ${details}`);
}

/**
 * Validates and returns server-only environment variables.
 * Call at runtime inside server modules/routes — not at module top-level —
 * so builds and unit tests can load without full secrets.
 */
export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    APP_URL: process.env.APP_URL,
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    MAGIC_HOUR_API_KEY: process.env.MAGIC_HOUR_API_KEY,
    MAGIC_HOUR_WEBHOOK_SECRET: process.env.MAGIC_HOUR_WEBHOOK_SECRET,
  });

  if (!parsed.success) {
    throw formatEnvError(parsed.error);
  }

  return parsed.data;
}
