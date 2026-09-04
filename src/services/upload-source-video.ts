import "server-only";

import {
  destroySourceVideo,
  uploadSourceVideoFromUrl,
} from "@/lib/cloudinary";
import { AppError } from "@/lib/errors";
import {
  hasAllowedVideoExtension,
  isAllowedVideoMimeType,
  MAX_VIDEO_BYTES,
} from "@/lib/upload/limits";
import {
  fetchUploadcareFileInfo,
  resolveTrustedUploadcareCdnUrl,
} from "@/lib/uploadcare";
import { getTransformationsCollection } from "@/models/transformation";
import type { UploadResponse } from "@/schemas/upload";
import type { TransformationDocument } from "@/types/transformation";

function toUploadResponse(
  id: string,
  document: TransformationDocument,
): UploadResponse {
  return {
    transformation: {
      id,
      status: "uploaded",
      sourceUploadcare: document.sourceUploadcare,
      sourceCloudinary: document.sourceCloudinary,
      createdAt: document.createdAt.toISOString(),
    },
  };
}

function validateUploadcareMetadata(options: {
  mimeType: string;
  filename: string;
  sizeBytes: number;
  isReady: boolean;
  isImage: boolean;
}): void {
  if (!options.isReady) {
    throw new AppError(
      "INVALID_VIDEO_REFERENCE",
      "The Uploadcare file is not ready yet. Please retry shortly.",
      409,
    );
  }

  if (options.isImage) {
    throw new AppError(
      "UNSUPPORTED_VIDEO_FORMAT",
      "Only MP4 and MOV video files are supported.",
      400,
    );
  }

  if (!isAllowedVideoMimeType(options.mimeType)) {
    throw new AppError(
      "UNSUPPORTED_VIDEO_FORMAT",
      "Unsupported video format. Please upload an MP4 or MOV file.",
      400,
    );
  }

  if (!hasAllowedVideoExtension(options.filename)) {
    throw new AppError(
      "UNSUPPORTED_VIDEO_FORMAT",
      "Unsupported video extension. Please upload an MP4 or MOV file.",
      400,
    );
  }

  if (options.sizeBytes > MAX_VIDEO_BYTES) {
    throw new AppError(
      "FILE_TOO_LARGE",
      `Video exceeds the ${MAX_VIDEO_BYTES / (1024 * 1024)} MB application limit.`,
      400,
    );
  }
}

/**
 * Uploadcare UUID → verify metadata → Cloudinary remote fetch → MongoDB record.
 */
export async function registerUploadedSourceVideo(
  uuid: string,
): Promise<UploadResponse> {
  const collection = await getTransformationsCollection();

  const existing = await collection.findOne({
    "sourceUploadcare.uuid": uuid,
  });

  if (existing) {
    return toUploadResponse(existing._id.toHexString(), existing);
  }

  const fileInfo = await fetchUploadcareFileInfo(uuid);

  validateUploadcareMetadata({
    mimeType: fileInfo.mime_type,
    filename: fileInfo.original_filename,
    sizeBytes: fileInfo.size,
    isReady: fileInfo.is_ready,
    isImage: fileInfo.is_image,
  });

  const trustedCdnUrl = resolveTrustedUploadcareCdnUrl(fileInfo);

  const sourceCloudinary = await uploadSourceVideoFromUrl({
    uploadcareUuid: uuid,
    sourceUrl: trustedCdnUrl,
  });

  const now = new Date();
  const document: TransformationDocument = {
    status: "uploaded",
    sourceUploadcare: {
      uuid,
      cdnUrl: trustedCdnUrl,
      mimeType: fileInfo.mime_type,
      filename: fileInfo.original_filename,
      sizeBytes: fileInfo.size,
    },
    sourceCloudinary,
    createdAt: now,
    updatedAt: now,
  };

  try {
    const insertResult = await collection.insertOne(document);
    return toUploadResponse(insertResult.insertedId.toHexString(), document);
  } catch (error) {
    await destroySourceVideo(sourceCloudinary.publicId);

    console.error("[upload] Failed to persist transformation record", {
      uploadcareUuid: uuid,
      cloudinaryPublicId: sourceCloudinary.publicId,
      error:
        error instanceof Error
          ? { name: error.name, message: error.message }
          : { message: "Unknown persistence error" },
    });

    throw new AppError(
      "INTERNAL_ERROR",
      "Failed to persist the uploaded transformation record.",
      500,
    );
  }
}
