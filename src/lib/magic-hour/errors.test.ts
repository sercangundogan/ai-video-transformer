import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppError } from "../errors";
import { mapMagicHourHttpError } from "./errors";

describe("mapMagicHourHttpError", () => {
  it("maps insufficient credits without leaking provider bodies", () => {
    const error = mapMagicHourHttpError(402, {
      code: "insufficient_credits",
      message: "need more credits secret-token",
    });

    assert.ok(error instanceof AppError);
    assert.equal(error.code, "INSUFFICIENT_CREDITS");
    assert.equal(error.status, 402);
    assert.equal(
      error.message,
      "Magic Hour reported insufficient credits for this transformation.",
    );
  });

  it("maps V3 unavailable to a user-safe version hint", () => {
    const error = mapMagicHourHttpError(422, {
      code: "unprocessable_entity",
      message: "V3 models are not available yet.",
    });

    assert.equal(error.code, "MAGIC_HOUR_INVALID_INPUT");
    assert.equal(error.status, 400);
    assert.match(error.message, /v1 or v2/i);
  });

  it("maps auth failures safely", () => {
    const error = mapMagicHourHttpError(401, { message: "bad key" });
    assert.equal(error.code, "MAGIC_HOUR_AUTH_ERROR");
    assert.equal(error.status, 502);
  });
});
