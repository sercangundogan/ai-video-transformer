import "server-only";

import { ObjectId } from "mongodb";

import { AppError } from "@/lib/errors";
import { createVideoToVideoJob } from "@/lib/magic-hour";
import { getTransformationsCollection } from "@/models/transformation";
import type {
  TransformParametersInput,
  TransformResponse,
} from "@/schemas/transform";
import type { TransformationStatus } from "@/types/transformation";

const STARTABLE_STATUSES = ["uploaded", "failed"] as const satisfies readonly TransformationStatus[];

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
      "startSeconds must be less than the source video duration.",
      400,
    );
  }

  if (parameters.endSeconds > durationSeconds + 0.05) {
    throw new AppError(
      "INVALID_REQUEST",
      "endSeconds cannot exceed the source video duration.",
      400,
    );
  }
}

function conflictForStatus(status: TransformationStatus): AppError {
  if (status === "queued" || status === "processing") {
    return new AppError(
      "INVALID_REQUEST",
      "This transformation is already in progress.",
      409,
    );
  }

  if (status === "completed") {
    return new AppError(
      "INVALID_REQUEST",
      "This transformation has already completed.",
      409,
    );
  }

  return new AppError(
    "INVALID_REQUEST",
    "This transformation cannot be started in its current state.",
    409,
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
    !(STARTABLE_STATUSES as readonly string[]).includes(existing.status)
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
  const previousStatus = existing.status;

  const claimed = await collection.findOneAndUpdate(
    {
      _id: objectId,
      status: { $in: [...STARTABLE_STATUSES] },
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

    const queuedAt = claimed.queuedAt ?? now;

    await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          magicHour: {
            projectId: job.projectId,
            creditsCharged: job.creditsCharged,
            providerStatus: "queued",
          },
          updatedAt: new Date(),
        },
      },
    );

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
    await collection.updateOne(
      { _id: objectId },
      {
        $set: {
          status: previousStatus,
          updatedAt: new Date(),
          ...(error instanceof AppError
            ? {
                failure: {
                  code: error.code,
                  message: error.message,
                },
              }
            : {}),
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
