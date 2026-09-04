import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canStartTransformation,
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

  it("allows reclaim of stuck queued without projectId", () => {
    assert.equal(
      canStartTransformation({
        status: "queued",
        hasMagicHourProjectId: false,
      }),
      true,
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
