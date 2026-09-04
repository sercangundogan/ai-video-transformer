import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  STALE_QUEUED_CLAIM_MS,
  canStartTransformation,
  isStaleQueuedClaim,
  startConflictMessage,
} from "./startability";

describe("canStartTransformation", () => {
  it("allows uploaded and failed", () => {
    assert.equal(
      canStartTransformation({
        status: "uploaded",
        hasMagicHourProjectId: false,
      }),
      true,
    );
    assert.equal(
      canStartTransformation({
        status: "failed",
        hasMagicHourProjectId: true,
      }),
      true,
    );
  });

  it("allows reclaim of stale queued without projectId", () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const queuedAt = new Date(now.getTime() - STALE_QUEUED_CLAIM_MS);

    assert.equal(
      canStartTransformation({
        status: "queued",
        hasMagicHourProjectId: false,
        queuedAt,
        now,
      }),
      true,
    );
  });

  it("rejects fresh queued without projectId (in-flight claim)", () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const queuedAt = new Date(now.getTime() - 1_000);

    assert.equal(
      canStartTransformation({
        status: "queued",
        hasMagicHourProjectId: false,
        queuedAt,
        now,
      }),
      false,
    );
  });

  it("rejects in-progress and completed states", () => {
    assert.equal(
      canStartTransformation({
        status: "queued",
        hasMagicHourProjectId: true,
      }),
      false,
    );
    assert.equal(
      canStartTransformation({
        status: "processing",
        hasMagicHourProjectId: true,
      }),
      false,
    );
    assert.equal(
      canStartTransformation({
        status: "completed",
        hasMagicHourProjectId: true,
      }),
      false,
    );
    assert.match(startConflictMessage("completed"), /already completed/i);
  });
});

describe("isStaleQueuedClaim", () => {
  it("treats missing queuedAt as stale", () => {
    assert.equal(isStaleQueuedClaim(undefined), true);
    assert.equal(isStaleQueuedClaim(null), true);
  });
});
