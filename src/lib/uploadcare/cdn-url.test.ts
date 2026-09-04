import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { AppError } from "../errors";
import { resolveTrustedUploadcareCdnUrl, type UploadcareFileInfo } from "./cdn-url";

function baseInfo(
  overrides: Partial<UploadcareFileInfo> = {},
): UploadcareFileInfo {
  return {
    uuid: "11111111-1111-4111-8111-111111111111",
    mime_type: "video/mp4",
    original_filename: "clip.mp4",
    size: 1000,
    is_ready: true,
    is_image: false,
    original_file_url:
      "https://ucarecdn.com/11111111-1111-4111-8111-111111111111/",
    ...overrides,
  };
}

describe("resolveTrustedUploadcareCdnUrl", () => {
  it("accepts trusted HTTPS Uploadcare hosts", () => {
    const url = resolveTrustedUploadcareCdnUrl(
      baseInfo({
        original_file_url:
          "https://abc123.ucarecd.net/11111111-1111-4111-8111-111111111111/video.mp4",
      }),
    );
    assert.match(url, /ucarecd\.net/);
  });

  it("rejects http and untrusted hosts", () => {
    assert.throws(
      () =>
        resolveTrustedUploadcareCdnUrl(
          baseInfo({
            original_file_url:
              "http://ucarecdn.com/11111111-1111-4111-8111-111111111111/",
          }),
        ),
      (error: unknown) =>
        error instanceof AppError && error.code === "UPLOADCARE_FAILURE",
    );

    assert.throws(
      () =>
        resolveTrustedUploadcareCdnUrl(
          baseInfo({
            original_file_url:
              "https://evil.example/11111111-1111-4111-8111-111111111111/",
          }),
        ),
      /trusted CDN host/,
    );
  });

  it("rejects UUID mismatch", () => {
    assert.throws(
      () =>
        resolveTrustedUploadcareCdnUrl(
          baseInfo({
            original_file_url:
              "https://ucarecdn.com/22222222-2222-4222-8222-222222222222/",
          }),
        ),
      /does not match the file UUID/,
    );
  });
});
