import "server-only";

import { z } from "zod";

import {
  CLOUDINARY_SOURCE_FOLDER,
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

function sourcePublicId(uploadcareUuid: string): string {
  return `${CLOUDINARY_SOURCE_FOLDER}/${uploadcareUuid}`;
}

function sourceHost(sourceUrl: string): string | undefined {
  try {
    return new URL(sourceUrl).host;
  } catch {
    return undefined;
  }
}

/**
 * Asks Cloudinary to fetch a trusted Uploadcare CDN URL.
 * The video binary does not transit through our Vercel function body.
 */
export async function uploadSourceVideoFromUrl(options: {
  uploadcareUuid: string;
  sourceUrl: string;
}): Promise<CloudinaryAsset> {
  const cloudinary = getCloudinary();
  const publicId = sourcePublicId(options.uploadcareUuid);
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
        operation: "upload_source_video_from_url.parse_response",
        uploadcareUuid: options.uploadcareUuid,
        publicId,
        sourceHost: host,
        error: {
          message: "Unexpected Cloudinary upload response shape",
        },
      });

      throw new AppError(
        "CLOUDINARY_FAILURE",
        "Failed to store the source video in Cloudinary.",
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
      operation: "upload_source_video_from_url",
      uploadcareUuid: options.uploadcareUuid,
      publicId,
      sourceHost: host,
      error,
    });

    throw new AppError(
      "CLOUDINARY_FAILURE",
      "Failed to store the source video in Cloudinary.",
      502,
    );
  }
}

/**
 * Best-effort cleanup when persistence fails after a successful Cloudinary upload.
 */
export async function destroySourceVideo(publicId: string): Promise<void> {
  const cloudinary = getCloudinary();

  try {
    await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
      invalidate: true,
    });
  } catch (error) {
    logCloudinaryFailure({
      operation: "destroy_source_video",
      publicId,
      error,
    });
  }
}
