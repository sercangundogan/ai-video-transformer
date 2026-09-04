import "server-only";

import { z } from "zod";

import { getMagicHourApiEnv } from "@/lib/env.server";
import { AppError } from "@/lib/errors";
import { mapMagicHourHttpError } from "@/lib/magic-hour/errors";
import { toMagicHourVideoToVideoBody } from "@/lib/magic-hour/map-request";
import type { TransformParametersInput } from "@/schemas/transform";

const createResponseSchema = z.object({
  id: z.string().min(1),
  credits_charged: z.number().int().nonnegative(),
});

export type MagicHourCreateVideoResult = {
  projectId: string;
  creditsCharged: number;
};

const MAGIC_HOUR_VIDEO_TO_VIDEO_URL =
  "https://api.magichour.ai/v1/video-to-video";

export async function createVideoToVideoJob(options: {
  parameters: TransformParametersInput;
  cloudinarySecureUrl: string;
}): Promise<MagicHourCreateVideoResult> {
  const { MAGIC_HOUR_API_KEY } = getMagicHourApiEnv();
  const body = toMagicHourVideoToVideoBody(options);

  let response: Response;
  try {
    response = await fetch(MAGIC_HOUR_VIDEO_TO_VIDEO_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${MAGIC_HOUR_API_KEY}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    console.error("[magic-hour] network failure creating video-to-video job", {
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: "Unknown network error" },
    });

    throw new AppError(
      "MAGIC_HOUR_PROCESSING_FAILURE",
      "Failed to reach Magic Hour to start the transformation.",
      502,
    );
  }

  const rawText = await response.text();
  let json: unknown;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch {
    json = null;
  }

  if (!response.ok) {
    throw mapMagicHourHttpError(response.status, json);
  }

  const parsed = createResponseSchema.safeParse(json);
  if (!parsed.success) {
    console.error("[magic-hour] unexpected create response shape", {
      issueCount: parsed.error.issues.length,
    });

    throw new AppError(
      "MAGIC_HOUR_PROCESSING_FAILURE",
      "Magic Hour returned an unexpected job response.",
      502,
    );
  }

  return {
    projectId: parsed.data.id,
    creditsCharged: parsed.data.credits_charged,
  };
}
