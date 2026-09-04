import { z } from "zod";

import {
  transformationParametersSchema,
  transformationStatusSchema,
} from "@/schemas/transformation";

export const HISTORY_DEFAULT_LIMIT = 50;
export const HISTORY_MAX_LIMIT = 100;

export const historyQuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(HISTORY_MAX_LIMIT)
    .default(HISTORY_DEFAULT_LIMIT),
});

/**
 * Public history item — only fields the frontend needs.
 * Omits provider error details, webhook secrets, and internal provider status.
 */
export const historyItemSchema = z.object({
  id: z.string().min(1),
  status: transformationStatusSchema,
  source: z.object({
    filename: z.string().min(1),
    mimeType: z.string().min(1),
    sizeBytes: z.number().int().nonnegative(),
    secureUrl: z.url(),
    durationSeconds: z.number().nonnegative().optional(),
  }),
  parameters: transformationParametersSchema.optional(),
  output: z
    .object({
      secureUrl: z.url(),
      format: z.string().min(1).optional(),
      durationSeconds: z.number().nonnegative().optional(),
    })
    .optional(),
  failure: z
    .object({
      code: z.string().min(1),
      message: z.string().min(1),
    })
    .optional(),
  createdAt: z.string().datetime(),
  queuedAt: z.string().datetime().optional(),
  processingStartedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  failedAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime(),
});

export const historyResponseSchema = z.object({
  transformations: z.array(historyItemSchema),
  meta: z.object({
    limit: z.number().int().positive(),
    count: z.number().int().nonnegative(),
    hasActive: z.boolean(),
  }),
});

export type HistoryItem = z.infer<typeof historyItemSchema>;
export type HistoryResponse = z.infer<typeof historyResponseSchema>;
