import "server-only";

import { ObjectId, type Filter } from "mongodb";

import { AppError } from "@/lib/errors";
import { createVideoToVideoJob } from "@/lib/magic-hour";
import {
  canStartTransformation,
  startConflictMessage,
} from "@/lib/transformations/startability";
import { getTransformationsCollection } from "@/models/transformation";
import type {
  TransformParametersInput,
  TransformResponse,
} from "@/schemas/transform";
import type {
  TransformationDocument,
  TransformationStatus,
} from "@/types/transformation";

function parseObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    throw new AppError(
      "TRANSFORMATION_NOT_FOUND",
      "Transformation was not found.",
      404,
    );
  }

  return new ObjectId(id);
}

function assertDurationBounds(
  parameters: TransformParametersInput,
  durationSeconds: number | undefined,
): void {
  if (durationSeconds === undefined || !Number.isFinite(durationSeconds)) {
    return;
  }

  if (parameters.startSeconds >= durationSeconds) {
    throw new AppError(
      "INVALID_REQUEST",
      "Start seconds must be less than the source video duration.",
      400,
    );
  }

  if (parameters.endSeconds > durationSeconds + 0.05) {
    throw new AppError(
      "INVALID_REQUEST",
      "End seconds cannot exceed the source video duration.",
      400,
    );
  }
}

function conflictForStatus(status: TransformationStatus): AppError {
  return new AppError(
    "INVALID_REQUEST",
    startConflictMessage(status),
    409,
  );
}

const CLAIM_FILTER: Filter<TransformationDocument> = {
  $or: [
    { status: { $in: ["uploaded", "failed"] } },
    {
      status: "queued",
      $or: [
        { magicHour: { $exists: false } },
        { "magicHour.projectId": { $exists: false } },
      ],
    },
  ],
};

async function persistMagicHourProjectId(options: {
  objectId: ObjectId;
  projectId: string;
  creditsCharged: number;
}): Promise<void> {
  const collection = await getTransformationsCollection();
  const magicHour = {
    projectId: options.projectId,
    creditsCharged: options.creditsCharged,
    providerStatus: "queued" as const,
  };

  const attempt = async () =>
    collection.updateOne(
      { _id: options.objectId },
      {
        $set: {
          magicHour,
          updatedAt: new Date(),
        },
      },
    );

  let result = await attempt();
  if (result.matchedCount === 0) {
    result = await attempt();
  }

  if (result.matchedCount === 1) {
    return;
  }

  // Last resort: keep projectId so webhooks can still complete, mark failed.
  console.error("[transform] failed to persist Magic Hour projectId", {
    transformationId: options.objectId.toHexString(),
    projectId: options.projectId,
  });

  await collection.updateOne(
    { _id: options.objectId },
    {
      $set: {
        status: "failed",
        magicHour,
        failedAt: new Date(),
        updatedAt: new Date(),
        failure: {
          code: "INTERNAL_ERROR",
          message:
            "The Magic Hour job was created, but saving its project ID failed. You can retry starting the transformation.",
        },
      },
    },
  );

  throw new AppError(
    "INTERNAL_ERROR",
    "The transformation job was created, but saving its state failed. Please retry.",
    500,
  );
}

/**
 * Starts a Magic Hour Video-to-Video job for a trusted uploaded transformation.
 * Uses an atomic status claim to prevent duplicate billable submissions.
 */
export async function startTransformation(options: {
  transformationId: string;
  parameters: TransformParametersInput;
}): Promise<TransformResponse> {
  const collection = await getTransformationsCollection();
  const objectId = parseObjectId(options.transformationId);

  const existing = await collection.findOne({ _id: objectId });
  if (!existing) {
    throw new AppError(
      "TRANSFORMATION_NOT_FOUND",
      "Transformation was not found.",
      404,
    );
  }

  if (
    !canStartTransformation({
      status: existing.status,
      hasMagicHourProjectId: Boolean(existing.magicHour?.projectId),
    })
  ) {
    throw conflictForStatus(existing.status);
  }

  assertDurationBounds(
    options.parameters,
    existing.sourceCloudinary.duration,
  );

  const effectiveParameters: TransformParametersInput = {
    ...options.parameters,
    fpsResolution: options.parameters.fpsResolution ?? "HALF",
    style: {
      ...options.parameters.style,
      version: options.parameters.style.version ?? "v2",
      promptType: options.parameters.style.promptType ?? "default",
      model: options.parameters.style.model ?? "default",
      prompt:
        (options.parameters.style.promptType ?? "default") === "default"
          ? null
          : (options.parameters.style.prompt ?? null),
    },
  };

  const now = new Date();

  if (
    existing.status === "queued" &&
    !existing.magicHour?.projectId
  ) {
    console.warn("[transform] reclaiming stuck queued transformation", {
      transformationId: objectId.toHexString(),
    });
  }

  const claimed = await collection.findOneAndUpdate(
    {
      _id: objectId,
      ...CLAIM_FILTER,
    },
    {
      $set: {
        status: "queued",
        parameters: effectiveParameters,
        queuedAt: now,
        updatedAt: now,
      },
      $unset: {
        failure: "",
        completedAt: "",
        failedAt: "",
        processingStartedAt: "",
        outputCloudinary: "",
        magicHour: "",
      },
    },
    { returnDocument: "after" },
  );

  if (!claimed) {
    const latest = await collection.findOne({ _id: objectId });
    if (!latest) {
      throw new AppError(
        "TRANSFORMATION_NOT_FOUND",
        "Transformation was not found.",
        404,
      );
    }
    throw conflictForStatus(latest.status);
  }

  try {
    const job = await createVideoToVideoJob({
      parameters: effectiveParameters,
      cloudinarySecureUrl: claimed.sourceCloudinary.secureUrl,
    });

    await persistMagicHourProjectId({
      objectId,
      projectId: job.projectId,
      creditsCharged: job.creditsCharged,
    });

    const queuedAt = claimed.queuedAt ?? now;

    return {
      transformation: {
        id: objectId.toHexString(),
        status: "queued",
        parameters: effectiveParameters,
        magicHour: {
          projectId: job.projectId,
          creditsCharged: job.creditsCharged,
        },
        queuedAt: queuedAt.toISOString(),
      },
    };
  } catch (error) {
    // If projectId persist already marked failed after MH success, rethrow as-is.
    if (
      error instanceof AppError &&
      error.code === "INTERNAL_ERROR" &&
      error.message.includes("saving its state failed")
    ) {
      throw error;
    }

    await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          status: "failed",
          failedAt: new Date(),
          updatedAt: new Date(),
          ...(error instanceof AppError
            ? {
                failure: {
                  code: error.code,
                  message: error.message,
                },
              }
            : {
                failure: {
                  code: "MAGIC_HOUR_PROCESSING_FAILURE",
                  message: "Failed to start the Magic Hour transformation.",
                },
              }),
        },
        $unset: {
          queuedAt: "",
          magicHour: "",
        },
      },
    );

    throw error;
  }
}
