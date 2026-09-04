import { z } from "zod";

/**
 * Internal transformation lifecycle statuses.
 * Intentionally decoupled from Magic Hour provider statuses.
 */
export const transformationStatusSchema = z.enum([
  "uploaded",
  "queued",
  "processing",
  "completed",
  "failed",
]);

export type TransformationStatus = z.infer<typeof transformationStatusSchema>;

export const ACTIVE_TRANSFORMATION_STATUSES = [
  "queued",
  "processing",
] as const satisfies readonly TransformationStatus[];

export const uploadcareSourceSchema = z.object({
  uuid: z.string().min(1),
  cdnUrl: z.url(),
  mimeType: z.string().min(1),
  filename: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const cloudinaryAssetSchema = z.object({
  publicId: z.string().min(1),
  secureUrl: z.url(),
  resourceType: z.literal("video"),
  bytes: z.number().int().nonnegative().optional(),
  format: z.string().min(1).optional(),
  duration: z.number().nonnegative().optional(),
});

export const transformationFailureSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  providerCode: z.string().min(1).optional(),
  providerMessage: z.string().min(1).optional(),
});

/**
 * Parameters persisted for history / replay.
 * Exact Magic Hour form fields are finalized in Phase 3 from the official API checklist.
 */
export const transformationParametersSchema = z
  .object({
    name: z.string().min(1).optional(),
    startSeconds: z.number().min(0),
    endSeconds: z.number().positive(),
    fpsResolution: z.enum(["FULL", "HALF"]).optional(),
    style: z.object({
      artStyle: z.string().min(1),
      version: z.enum(["v1", "v2", "default"]).optional(),
      promptType: z.enum(["default", "custom", "append_default"]).optional(),
      prompt: z.string().nullable().optional(),
      model: z.string().min(1).optional(),
    }),
  })
  .strict();

export const magicHourJobSchema = z.object({
  projectId: z.string().min(1),
  creditsCharged: z.number().int().nonnegative().optional(),
  providerStatus: z.string().min(1).optional(),
});

export const transformationDocumentSchema = z.object({
  status: transformationStatusSchema,
  sourceUploadcare: uploadcareSourceSchema,
  sourceCloudinary: cloudinaryAssetSchema,
  outputCloudinary: cloudinaryAssetSchema.optional(),
  parameters: transformationParametersSchema.optional(),
  magicHour: magicHourJobSchema.optional(),
  failure: transformationFailureSchema.optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  queuedAt: z.date().optional(),
  processingStartedAt: z.date().optional(),
  completedAt: z.date().optional(),
  failedAt: z.date().optional(),
});

export type UploadcareSource = z.infer<typeof uploadcareSourceSchema>;
export type CloudinaryAsset = z.infer<typeof cloudinaryAssetSchema>;
export type TransformationParameters = z.infer<
  typeof transformationParametersSchema
>;
export type TransformationFailure = z.infer<typeof transformationFailureSchema>;
export type MagicHourJob = z.infer<typeof magicHourJobSchema>;
export type TransformationDocument = z.infer<
  typeof transformationDocumentSchema
>;
