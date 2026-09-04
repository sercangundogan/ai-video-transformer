import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assertTrustedMagicHourDownloadUrl,
  isTrustedMagicHourDownloadHost,
} from "./download-url";

describe("Magic Hour download URL trust", () => {
  it("accepts videos.magichour.ai HTTPS URLs", () => {
    assert.equal(isTrustedMagicHourDownloadHost("videos.magichour.ai"), true);
    const url = assertTrustedMagicHourDownloadUrl(
      "https://videos.magichour.ai/abc/video.mp4?X-Goog-Signature=test",
      (message) => new Error(message),
    );
    assert.match(url, /^https:\/\/videos\.magichour\.ai\//);
  });

  it("rejects non-HTTPS and untrusted hosts", () => {
    assert.equal(isTrustedMagicHourDownloadHost("evil.example"), false);

    assert.throws(
      () =>
        assertTrustedMagicHourDownloadUrl(
          "http://videos.magichour.ai/x.mp4",
          (message) => new Error(message),
        ),
      /HTTPS/,
    );

    assert.throws(
      () =>
        assertTrustedMagicHourDownloadUrl(
          "https://evil.example/x.mp4",
          (message) => new Error(message),
        ),
      /not trusted/,
    );
  });
});
