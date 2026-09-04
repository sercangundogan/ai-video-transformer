import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ObjectId } from "mongodb";

import { toHistoryItem } from "./map-item";
import type { TransformationDocument } from "../../schemas/transformation";

describe("toHistoryItem", () => {
  it("exposes only public failure fields", () => {
    const doc = {
      _id: new ObjectId(),
      status: "failed" as const,
      sourceUploadcare: {
        uuid: "11111111-1111-4111-8111-111111111111",
        cdnUrl: "https://ucarecdn.com/11111111-1111-4111-8111-111111111111/",
        mimeType: "video/mp4",
        filename: "clip.mp4",
        sizeBytes: 1000,
      },
      sourceCloudinary: {
        publicId: "ai-video-transformer/source/x",
        secureUrl: "https://res.cloudinary.com/demo/video/upload/x.mp4",
        resourceType: "video" as const,
      },
      failure: {
        code: "MAGIC_HOUR_PROCESSING_FAILURE",
        message: "The video transformation failed.",
        providerMessage: "internal provider stack",
        providerCode: "secret-ish",
      },
      magicHour: {
        projectId: "proj_123",
        creditsCharged: 30,
        providerStatus: "error",
      },
      createdAt: new Date("2026-09-04T12:00:00.000Z"),
      updatedAt: new Date("2026-09-04T12:01:00.000Z"),
      failedAt: new Date("2026-09-04T12:01:00.000Z"),
    } satisfies TransformationDocument & { _id: ObjectId };

    const item = toHistoryItem(doc);

    assert.equal(item.failure?.code, "MAGIC_HOUR_PROCESSING_FAILURE");
    assert.equal(item.failure?.message, "The video transformation failed.");
    assert.equal(
      Object.prototype.hasOwnProperty.call(item.failure ?? {}, "providerMessage"),
      false,
    );
    assert.equal(Object.prototype.hasOwnProperty.call(item, "magicHour"), false);
  });
});
