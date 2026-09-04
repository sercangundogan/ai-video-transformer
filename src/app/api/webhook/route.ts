import { NextResponse } from "next/server";

import { getMagicHourWebhookEnv } from "@/lib/env.server";
import { AppError, handleRouteError } from "@/lib/errors";
import {
  MAGIC_HOUR_SIGNATURE_HEADER,
  MAGIC_HOUR_TIMESTAMP_HEADER,
  verifyMagicHourWebhook,
} from "@/lib/magic-hour/verify-webhook";
import {
  magicHourWebhookEventSchema,
  type WebhookAck,
} from "@/schemas/webhook";
import { processMagicHourWebhookEvent } from "@/services/process-webhook-event";

export const runtime = "nodejs";
/** Completion copies Magic Hour output into Cloudinary before acknowledging. */
export const maxDuration = 60;

/**
 * Magic Hour dashboard-registered webhook receiver.
 * Verifies signature + timestamp before any status mutation.
 */
export async function POST(
  request: Request,
): Promise<NextResponse<WebhookAck | { error: unknown }>> {
  try {
    const rawBody = await request.text();
    const { MAGIC_HOUR_WEBHOOK_SECRET } = getMagicHourWebhookEnv();

    verifyMagicHourWebhook({
      signatureHeader: request.headers.get(MAGIC_HOUR_SIGNATURE_HEADER),
      timestampHeader: request.headers.get(MAGIC_HOUR_TIMESTAMP_HEADER),
      rawBody,
      webhookSecret: MAGIC_HOUR_WEBHOOK_SECRET,
    });

    let json: unknown;
    try {
      json = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      throw new AppError(
        "INVALID_REQUEST",
        "Webhook body must be valid JSON.",
        400,
      );
    }

    const parsed = magicHourWebhookEventSchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        "INVALID_REQUEST",
        "Invalid Magic Hour webhook payload.",
        400,
        { issueCount: parsed.error.issues.length },
      );
    }

    const result = await processMagicHourWebhookEvent(parsed.data);
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
