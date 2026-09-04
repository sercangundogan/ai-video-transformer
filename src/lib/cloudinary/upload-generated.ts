import "server-only";

import { z } from "zod";

import {
  CLOUDINARY_GENERATED_FOLDER,
  getCloudinary,
} from "@/lib/cloudinary/client";
import { logCloudinaryFailure } from "@/lib/cloudinary/errors";
import { AppError } from "@/lib/errors";
import type { CloudinaryAsset } from "@/types/transformation";

const cloudinaryUploadResultSchema = z.object({
  public_id: z.string().min(1),
  secure_url: z.url(),
  resource_type: z.literal("video"),
  bytes: z.number().int().nonnegative().optional(),
  format: z.string().min(1).optional(),
  duration: z.number().nonnegative().optional(),
});

export function generatedPublicId(magicHourProjectId: string): string {
  return `${CLOUDINARY_GENERATED_FOLDER}/${magicHourProjectId}`;
}

function sourceHost(sourceUrl: string): string | undefined {
  try {
    return new URL(sourceUrl).host;
  } catch {
    return undefined;
  }
}

/**
 * Copies a Magic Hour download URL into Cloudinary under a deterministic public ID.
 * Duplicate completion events overwrite the same asset instead of creating copies.
 */
export async function uploadGeneratedVideoFromUrl(options: {
  magicHourProjectId: string;
  sourceUrl: string;
}): Promise<CloudinaryAsset> {
  const cloudinary = getCloudinary();
  const publicId = generatedPublicId(options.magicHourProjectId);
  const host = sourceHost(options.sourceUrl);

  try {
    const result = await cloudinary.uploader.upload(options.sourceUrl, {
      resource_type: "video",
      public_id: publicId,
      overwrite: true,
      invalidate: true,
    });

    const parsed = cloudinaryUploadResultSchema.safeParse(result);
    if (!parsed.success) {
      logCloudinaryFailure({
        operation: "upload_generated_video_from_url.parse_response",
        publicId,
        sourceHost: host,
        error: {
          message: "Unexpected Cloudinary upload response shape",
        },
      });

      throw new AppError(
        "OUTPUT_TRANSFER_FAILURE",
        "Failed to store the generated video in Cloudinary.",
        502,
      );
    }

    return {
      publicId: parsed.data.public_id,
      secureUrl: parsed.data.secure_url,
      resourceType: "video",
      bytes: parsed.data.bytes,
      format: parsed.data.format,
      duration: parsed.data.duration,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    logCloudinaryFailure({
      operation: "upload_generated_video_from_url",
      publicId,
      sourceHost: host,
      error,
    });

    throw new AppError(
      "OUTPUT_TRANSFER_FAILURE",
      "Failed to store the generated video in Cloudinary.",
      502,
    );
  }
}
