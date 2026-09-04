import type { WithId } from "mongodb";

import type { HistoryItem } from "@/schemas/history";
import type { TransformationDocument } from "@/schemas/transformation";

function toIso(value: Date | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

/**
 * Maps a MongoDB transformation document to the public history DTO.
 * Strips provider error details and unnecessary Magic Hour metadata.
 */
export function toHistoryItem(
  doc: WithId<TransformationDocument>,
): HistoryItem {
  return {
    id: doc._id.toHexString(),
    status: doc.status,
    source: {
      filename: doc.sourceUploadcare.filename,
      mimeType: doc.sourceUploadcare.mimeType,
      sizeBytes: doc.sourceUploadcare.sizeBytes,
      secureUrl: doc.sourceCloudinary.secureUrl,
      durationSeconds: doc.sourceCloudinary.duration,
    },
    parameters: doc.parameters,
    output: doc.outputCloudinary
      ? {
          secureUrl: doc.outputCloudinary.secureUrl,
          format: doc.outputCloudinary.format,
          durationSeconds: doc.outputCloudinary.duration,
        }
      : undefined,
    failure: doc.failure
      ? {
          code: doc.failure.code,
          message: doc.failure.message,
        }
      : undefined,
    createdAt: doc.createdAt.toISOString(),
    queuedAt: toIso(doc.queuedAt),
    processingStartedAt: toIso(doc.processingStartedAt),
    completedAt: toIso(doc.completedAt),
    failedAt: toIso(doc.failedAt),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
