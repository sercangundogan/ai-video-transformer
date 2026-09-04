import "server-only";

import { uploadGeneratedVideoFromUrl } from "@/lib/cloudinary/upload-generated";
import { AppError } from "@/lib/errors";
import { assertTrustedMagicHourDownloadUrl } from "@/lib/magic-hour/download-url";
import { getTransformationsCollection } from "@/models/transformation";
import {
  magicHourVideoWebhookTypeSchema,
  type MagicHourVideoWebhookPayload,
  type MagicHourWebhookEvent,
  type WebhookAck,
} from "@/schemas/webhook";
import type { TransformationStatus } from "@/types/transformation";

function providerErrorMessage(
  error: MagicHourVideoWebhookPayload["error"],
): string | undefined {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = error.message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }

  return undefined;
}

function firstDownloadUrl(
  downloads: MagicHourVideoWebhookPayload["downloads"],
): string | undefined {
  if (!downloads || downloads.length === 0) {
    return undefined;
  }

  return downloads[0]?.url;
}

async function findByProjectId(projectId: string) {
  const collection = await getTransformationsCollection();
  return collection.findOne({ "magicHour.projectId": projectId });
}

async function handleVideoStarted(
  payload: MagicHourVideoWebhookPayload,
): Promise<WebhookAck> {
  const collection = await getTransformationsCollection();
  const existing = await findByProjectId(payload.id);

  if (!existing) {
    console.warn("[webhook] unknown Magic Hour project for video.started", {
      projectId: payload.id,
    });
    return {
      message: "Ignored unknown project.",
      ignored: true,
      reason: "unknown_project",
    };
  }

  const terminal: TransformationStatus[] = ["completed", "failed"];
  if (terminal.includes(existing.status)) {
    return {
      message: "Ignored late video.started for terminal transformation.",
      ignored: true,
      reason: "terminal_status",
      transformationId: existing._id.toHexString(),
      status: existing.status,
    };
  }

  if (existing.status === "processing") {
    await collection.updateOne(
      { _id: existing._id },
      {
        $set: {
          "magicHour.providerStatus": payload.status ?? "rendering",
          ...(typeof payload.credits_charged === "number"
            ? { "magicHour.creditsCharged": payload.credits_charged }
            : {}),
          updatedAt: new Date(),
        },
      },
    );

    return {
      message: "Already processing.",
      handled: true,
      transformationId: existing._id.toHexString(),
      status: "processing",
    };
  }

  const now = new Date();
  const updated = await collection.findOneAndUpdate(
    {
      _id: existing._id,
      status: { $in: ["queued", "processing"] },
    },
    {
      $set: {
        status: "processing",
        processingStartedAt: existing.processingStartedAt ?? now,
        updatedAt: now,
        "magicHour.providerStatus": payload.status ?? "rendering",
        ...(typeof payload.credits_charged === "number"
          ? { "magicHour.creditsCharged": payload.credits_charged }
          : {}),
      },
      $unset: {
        failure: "",
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    const latest = await collection.findOne({ _id: existing._id });
    return {
      message: "Ignored video.started due to concurrent status change.",
      ignored: true,
      reason: "race",
      transformationId: existing._id.toHexString(),
      status: latest?.status,
    };
  }

  return {
    message: "Marked processing.",
    handled: true,
    transformationId: updated._id.toHexString(),
    status: updated.status,
  };
}

async function handleVideoCompleted(
  payload: MagicHourVideoWebhookPayload,
): Promise<WebhookAck> {
  const collection = await getTransformationsCollection();
  const existing = await findByProjectId(payload.id);

  if (!existing) {
    console.warn("[webhook] unknown Magic Hour project for video.completed", {
      projectId: payload.id,
    });
    return {
      message: "Ignored unknown project.",
      ignored: true,
      reason: "unknown_project",
    };
  }

  if (existing.status === "completed" && existing.outputCloudinary) {
    return {
      message: "Already completed.",
      handled: true,
      transformationId: existing._id.toHexString(),
      status: "completed",
    };
  }

  const downloadUrl = firstDownloadUrl(payload.downloads);
  if (!downloadUrl) {
    console.error("[webhook] video.completed missing download URL", {
      projectId: payload.id,
      transformationId: existing._id.toHexString(),
    });

    throw new AppError(
      "OUTPUT_TRANSFER_FAILURE",
      "Magic Hour completion event did not include a download URL.",
      502,
    );
  }

  const trustedDownloadUrl = assertTrustedMagicHourDownloadUrl(
    downloadUrl,
    (message) =>
      new AppError("OUTPUT_TRANSFER_FAILURE", message, 502),
  );

  const output = await uploadGeneratedVideoFromUrl({
    magicHourProjectId: payload.id,
    sourceUrl: trustedDownloadUrl,
  });

  const now = new Date();
  const updated = await collection.findOneAndUpdate(
    {
      _id: existing._id,
      $or: [
        { status: { $in: ["queued", "processing", "failed"] } },
        { status: "completed", outputCloudinary: { $exists: false } },
      ],
    },
    {
      $set: {
        status: "completed",
        outputCloudinary: output,
        completedAt: now,
        updatedAt: now,
        "magicHour.providerStatus": payload.status ?? "complete",
        ...(typeof payload.credits_charged === "number"
          ? { "magicHour.creditsCharged": payload.credits_charged }
          : {}),
      },
      $unset: {
        failure: "",
        failedAt: "",
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    const latest = await collection.findOne({ _id: existing._id });
    if (latest?.status === "completed" && latest.outputCloudinary) {
      return {
        message: "Already completed.",
        handled: true,
        transformationId: latest._id.toHexString(),
        status: "completed",
      };
    }

    console.error("[webhook] failed to persist completed status", {
      projectId: payload.id,
      transformationId: existing._id.toHexString(),
      status: latest?.status,
    });

    throw new AppError(
      "INTERNAL_ERROR",
      "Failed to persist completed transformation state.",
      500,
    );
  }

  return {
    message: "Marked completed.",
    handled: true,
    transformationId: updated._id.toHexString(),
    status: updated.status,
  };
}

async function handleVideoErrored(
  payload: MagicHourVideoWebhookPayload,
): Promise<WebhookAck> {
  const collection = await getTransformationsCollection();
  const existing = await findByProjectId(payload.id);

  if (!existing) {
    console.warn("[webhook] unknown Magic Hour project for video.errored", {
      projectId: payload.id,
    });
    return {
      message: "Ignored unknown project.",
      ignored: true,
      reason: "unknown_project",
    };
  }

  if (existing.status === "completed") {
    return {
      message: "Ignored video.errored after completion.",
      ignored: true,
      reason: "already_completed",
      transformationId: existing._id.toHexString(),
      status: "completed",
    };
  }

  if (existing.status === "failed") {
    return {
      message: "Already failed.",
      handled: true,
      transformationId: existing._id.toHexString(),
      status: "failed",
    };
  }

  const providerMessage =
    providerErrorMessage(payload.error) ??
    "Magic Hour reported a transformation error.";

  const now = new Date();
  const updated = await collection.findOneAndUpdate(
    {
      _id: existing._id,
      status: { $in: ["queued", "processing"] },
    },
    {
      $set: {
        status: "failed",
        failedAt: now,
        updatedAt: now,
        "magicHour.providerStatus": payload.status ?? "error",
        ...(typeof payload.credits_charged === "number"
          ? { "magicHour.creditsCharged": payload.credits_charged }
          : {}),
        failure: {
          code: "MAGIC_HOUR_PROCESSING_FAILURE",
          message: "The video transformation failed.",
          providerMessage,
        },
      },
    },
    { returnDocument: "after" },
  );

  if (!updated) {
    const latest = await collection.findOne({ _id: existing._id });
    return {
      message: "Ignored video.errored due to concurrent status change.",
      ignored: true,
      reason: "race",
      transformationId: existing._id.toHexString(),
      status: latest?.status,
    };
  }

  return {
    message: "Marked failed.",
    handled: true,
    transformationId: updated._id.toHexString(),
    status: updated.status,
  };
}

/**
 * Applies a verified Magic Hour webhook event to the matching Transformation.
 * Completion transfer is idempotent via deterministic Cloudinary public IDs.
 */
export async function processMagicHourWebhookEvent(
  event: MagicHourWebhookEvent,
): Promise<WebhookAck> {
  const videoType = magicHourVideoWebhookTypeSchema.safeParse(event.type);
  if (!videoType.success) {
    return {
      message: "Ignored non-video webhook event.",
      ignored: true,
      reason: "unsupported_event_type",
    };
  }

  switch (videoType.data) {
    case "video.started":
      return handleVideoStarted(event.payload);
    case "video.completed":
      return handleVideoCompleted(event.payload);
    case "video.errored":
      return handleVideoErrored(event.payload);
  }
}
