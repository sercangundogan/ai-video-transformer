import { z } from "zod";

/**
 * Magic Hour video webhook event types we handle in Phase 4.
 * @see https://docs.magichour.ai/integration/webhook/event-types
 */
export const magicHourVideoWebhookTypeSchema = z.enum([
  "video.started",
  "video.completed",
  "video.errored",
]);

export type MagicHourVideoWebhookType = z.infer<
  typeof magicHourVideoWebhookTypeSchema
>;

const magicHourDownloadSchema = z.object({
  url: z.url(),
  expires_at: z.string().min(1).optional(),
});

/**
 * Shared video project payload fields from Magic Hour webhook docs.
 * Extra fields are allowed — we only depend on id / status / downloads / error / credits.
 */
export const magicHourVideoWebhookPayloadSchema = z
  .object({
    id: z.string().min(1),
    status: z.string().min(1).optional(),
    type: z.string().min(1).optional(),
    credits_charged: z.number().int().nonnegative().optional(),
    downloads: z.array(magicHourDownloadSchema).nullable().optional(),
    error: z
      .union([
        z.string(),
        z.null(),
        z
          .object({
            message: z.string().optional(),
            code: z.string().optional(),
          })
          .passthrough(),
      ])
      .optional(),
  })
  .passthrough();

export const magicHourWebhookEventSchema = z
  .object({
    type: z.string().min(1),
    payload: magicHourVideoWebhookPayloadSchema,
  })
  .passthrough();

export type MagicHourVideoWebhookPayload = z.infer<
  typeof magicHourVideoWebhookPayloadSchema
>;
export type MagicHourWebhookEvent = z.infer<typeof magicHourWebhookEventSchema>;

export const webhookAckSchema = z.object({
  message: z.string().min(1),
  handled: z.boolean().optional(),
  ignored: z.boolean().optional(),
  reason: z.string().min(1).optional(),
  transformationId: z.string().min(1).optional(),
  status: z.string().min(1).optional(),
});

export type WebhookAck = z.infer<typeof webhookAckSchema>;
