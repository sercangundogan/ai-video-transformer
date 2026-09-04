import { createHmac, timingSafeEqual } from "node:crypto";

import { AppError } from "@/lib/errors";

/** Magic Hour recommended replay window (5 minutes). */
export const MAGIC_HOUR_WEBHOOK_MAX_SKEW_SECONDS = 5 * 60;

export const MAGIC_HOUR_SIGNATURE_HEADER = "magic-hour-event-signature";
export const MAGIC_HOUR_TIMESTAMP_HEADER = "magic-hour-event-timestamp";

/**
 * Computes HMAC-SHA256 hex digest for Magic Hour webhook verification.
 * Signed payload format: `{timestamp}.{raw_json_body}`
 */
export function computeMagicHourWebhookSignature(
  signedPayload: string,
  webhookSecret: string,
): string {
  return createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");
}

function signaturesEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

/**
 * Verifies Magic Hour webhook authenticity and replay window.
 * Uses the raw body string exactly as received (do not re-stringify JSON).
 */
export function verifyMagicHourWebhook(options: {
  signatureHeader: string | null;
  timestampHeader: string | null;
  rawBody: string;
  webhookSecret: string;
  nowSeconds?: number;
  maxSkewSeconds?: number;
}): void {
  const signature = options.signatureHeader?.trim() ?? "";
  const timestampRaw = options.timestampHeader?.trim() ?? "";

  if (!signature || !timestampRaw) {
    throw new AppError(
      "INVALID_WEBHOOK_SIGNATURE",
      "Missing Magic Hour webhook security headers.",
      401,
    );
  }

  if (!/^\d+$/.test(timestampRaw)) {
    throw new AppError(
      "INVALID_WEBHOOK_SIGNATURE",
      "Invalid Magic Hour webhook timestamp.",
      401,
    );
  }

  const timestampSeconds = Number(timestampRaw);
  const nowSeconds = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  const maxSkew =
    options.maxSkewSeconds ?? MAGIC_HOUR_WEBHOOK_MAX_SKEW_SECONDS;

  if (Math.abs(nowSeconds - timestampSeconds) > maxSkew) {
    throw new AppError(
      "STALE_WEBHOOK",
      "Magic Hour webhook timestamp is outside the accepted window.",
      401,
    );
  }

  const signedPayload = `${timestampRaw}.${options.rawBody}`;
  const expected = computeMagicHourWebhookSignature(
    signedPayload,
    options.webhookSecret,
  );

  if (!signaturesEqual(expected, signature)) {
    throw new AppError(
      "INVALID_WEBHOOK_SIGNATURE",
      "Invalid Magic Hour webhook signature.",
      401,
    );
  }
}
