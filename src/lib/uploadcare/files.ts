import "server-only";

import { getUploadcareServerEnv } from "@/lib/env.server";
import { getPublicEnv } from "@/lib/env.public";
import { AppError } from "@/lib/errors";
import {
  uploadcareFileInfoSchema,
  type UploadcareFileInfo,
} from "@/lib/uploadcare/cdn-url";

export type { UploadcareFileInfo } from "@/lib/uploadcare/cdn-url";
export {
  buildUploadcareCdnUrl,
  resolveTrustedUploadcareCdnUrl,
} from "@/lib/uploadcare/cdn-url";

/**
 * Fetches authoritative file metadata from Uploadcare REST API.
 * Requires the project secret — never trust client-reported size/MIME alone.
 */
export async function fetchUploadcareFileInfo(
  uuid: string,
): Promise<UploadcareFileInfo> {
  const { NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY } = getPublicEnv();
  const { UPLOADCARE_SECRET_KEY } = getUploadcareServerEnv();

  const response = await fetch(`https://api.uploadcare.com/files/${uuid}/`, {
    method: "GET",
    headers: {
      Accept: "application/vnd.uploadcare-v0.7+json",
      Authorization: `Uploadcare.Simple ${NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY}:${UPLOADCARE_SECRET_KEY}`,
    },
    cache: "no-store",
  });

  if (response.status === 404) {
    throw new AppError(
      "INVALID_VIDEO_REFERENCE",
      "Uploadcare file was not found for the provided UUID.",
      400,
    );
  }

  if (!response.ok) {
    console.error("[uploadcare] file metadata request failed", {
      uuid,
      status: response.status,
    });

    throw new AppError(
      "UPLOADCARE_FAILURE",
      "Failed to verify the Uploadcare file metadata.",
      502,
    );
  }

  const json: unknown = await response.json();
  const parsed = uploadcareFileInfoSchema.safeParse(json);

  if (!parsed.success) {
    console.error("[uploadcare] unexpected file metadata shape", {
      uuid,
      issueCount: parsed.error.issues.length,
    });

    throw new AppError(
      "UPLOADCARE_FAILURE",
      "Uploadcare returned unexpected file metadata.",
      502,
    );
  }

  return parsed.data;
}
