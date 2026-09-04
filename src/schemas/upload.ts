import { z } from "zod";

import { MAX_VIDEO_BYTES } from "@/lib/upload/limits";

export const uploadcareUuidSchema = z.uuid();

export const uploadRequestSchema = z.object({
  uuid: uploadcareUuidSchema,
});

export type UploadRequest = z.infer<typeof uploadRequestSchema>;

export const uploadResponseSchema = z.object({
  transformation: z.object({
    id: z.string().min(1),
    status: z.literal("uploaded"),
    sourceUploadcare: z.object({
      uuid: z.string().min(1),
      cdnUrl: z.url(),
      mimeType: z.string().min(1),
      filename: z.string().min(1),
      sizeBytes: z.number().int().nonnegative().max(MAX_VIDEO_BYTES),
    }),
    sourceCloudinary: z.object({
      publicId: z.string().min(1),
      secureUrl: z.url(),
      resourceType: z.literal("video"),
      bytes: z.number().int().nonnegative().optional(),
      format: z.string().min(1).optional(),
      duration: z.number().nonnegative().optional(),
    }),
    createdAt: z.string().datetime(),
  }),
});

export type UploadResponse = z.infer<typeof uploadResponseSchema>;
