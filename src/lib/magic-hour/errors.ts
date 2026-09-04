import { z } from "zod";

import { AppError } from "@/lib/errors";

const providerErrorSchema = z.object({
  code: z.string().optional(),
  message: z.string().optional(),
});

/**
 * Maps Magic Hour HTTP create-job errors to stable application errors.
 * Logs provider validation code/message server-side; never returns secrets.
 */
export function mapMagicHourHttpError(
  status: number,
  body: unknown,
  requestSummary?: Record<string, unknown>,
): AppError {
  const parsed = providerErrorSchema.safeParse(body);
  const providerCode = parsed.success ? parsed.data.code : undefined;
  const providerMessage = parsed.success ? parsed.data.message : undefined;

  console.error("[magic-hour] create job failed", {
    status,
    providerCode,
    providerMessage,
    request: requestSummary,
  });

  if (status === 401) {
    return new AppError(
      "MAGIC_HOUR_AUTH_ERROR",
      "Magic Hour authentication failed. Check the API key configuration.",
      502,
    );
  }

  if (
    status === 402 ||
    providerCode === "insufficient_credits" ||
    providerCode === "subscription_required"
  ) {
    return new AppError(
      "INSUFFICIENT_CREDITS",
      "Magic Hour reported insufficient credits for this transformation.",
      402,
    );
  }

  if (
    providerMessage?.toLowerCase().includes("v3 models are not available")
  ) {
    return new AppError(
      "MAGIC_HOUR_INVALID_INPUT",
      'This art style is not available with version "default" yet. Choose version v1 or v2.',
      400,
    );
  }

  if (status === 400 || status === 422 || status === 404) {
    return new AppError(
      "MAGIC_HOUR_INVALID_INPUT",
      "Magic Hour rejected the transformation input.",
      400,
    );
  }

  return new AppError(
    "MAGIC_HOUR_PROCESSING_FAILURE",
    "Magic Hour failed to accept the transformation job.",
    502,
  );
}
