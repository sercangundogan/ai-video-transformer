import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppError } from "../errors";
import {
  MAGIC_HOUR_WEBHOOK_MAX_SKEW_SECONDS,
  computeMagicHourWebhookSignature,
  verifyMagicHourWebhook,
} from "./verify-webhook";

const SECRET = "test-webhook-secret";
const BODY =
  '{"type":"video.started","payload":{"id":"cmtn5t2il08ogjk01eoup25tg","status":"rendering"}}';

describe("verifyMagicHourWebhook", () => {
  it("accepts a valid signature within the skew window", () => {
    const timestamp = "1729314984";
    const signature = computeMagicHourWebhookSignature(
      `${timestamp}.${BODY}`,
      SECRET,
    );

    assert.doesNotThrow(() => {
      verifyMagicHourWebhook({
        signatureHeader: signature,
        timestampHeader: timestamp,
        rawBody: BODY,
        webhookSecret: SECRET,
        nowSeconds: Number(timestamp),
      });
    });
  });

  it("rejects an invalid signature", () => {
    const timestamp = "1729314984";

    assert.throws(
      () => {
        verifyMagicHourWebhook({
          signatureHeader: "deadbeef",
          timestampHeader: timestamp,
          rawBody: BODY,
          webhookSecret: SECRET,
          nowSeconds: Number(timestamp),
        });
      },
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "INVALID_WEBHOOK_SIGNATURE" &&
        error.status === 401,
    );
  });

  it("rejects a stale timestamp", () => {
    const timestamp = "1000";
    const signature = computeMagicHourWebhookSignature(
      `${timestamp}.${BODY}`,
      SECRET,
    );

    assert.throws(
      () => {
        verifyMagicHourWebhook({
          signatureHeader: signature,
          timestampHeader: timestamp,
          rawBody: BODY,
          webhookSecret: SECRET,
          nowSeconds:
            Number(timestamp) + MAGIC_HOUR_WEBHOOK_MAX_SKEW_SECONDS + 1,
        });
      },
      (error: unknown) =>
        error instanceof AppError &&
        error.code === "STALE_WEBHOOK" &&
        error.status === 401,
    );
  });

  it("rejects missing headers", () => {
    assert.throws(
      () => {
        verifyMagicHourWebhook({
          signatureHeader: null,
          timestampHeader: null,
          rawBody: BODY,
          webhookSecret: SECRET,
        });
      },
      (error: unknown) =>
        error instanceof AppError && error.code === "INVALID_WEBHOOK_SIGNATURE",
    );
  });
});
