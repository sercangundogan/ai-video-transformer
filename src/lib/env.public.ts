import { z } from "zod";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY: z.string().min(1),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

/**
 * Validates browser-exposed environment variables.
 * Safe to import from Client Components.
 */
export function getPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY:
      process.env.NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY,
  });

  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid public environment: ${details}`);
  }

  return parsed.data;
}
