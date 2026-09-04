import "server-only";

import { z } from "zod";

import { getUploadcareServerEnv } from "@/lib/env.server";
import { getPublicEnv } from "@/lib/env.public";
import { AppError } from "@/lib/errors";

const uploadcareFileInfoSchema = z.object({
  uuid: z.string().min(1),
  mime_type: z.string().min(1),
  original_filename: z.string().min(1),
  size: z.number().int().nonnegative(),
  is_ready: z.boolean(),
  is_image: z.boolean(),
  original_file_url: z.url().nullable().optional(),
});

export type UploadcareFileInfo = z.infer<typeof uploadcareFileInfoSchema>;

function isTrustedUploadcareHost(hostname: string): boolean {
  return (
    hostname === "ucarecdn.com" ||
    hostname.endsWith(".ucarecdn.com") ||
    hostname.endsWith(".ucarecd.net")
  );
}

/**
 * Resolves a Cloudinary-fetchable CDN URL from trusted Uploadcare REST metadata.
 * Modern Uploadcare projects serve files from project-specific `*.ucarecd.net`
 * hosts via `original_file_url` — the legacy `ucarecdn.com/{uuid}/` form can 404.
 */
export function resolveTrustedUploadcareCdnUrl(
  fileInfo: UploadcareFileInfo,
): string {
  if (fileInfo.original_file_url) {
    let parsed: URL;
    try {
      parsed = new URL(fileInfo.original_file_url);
    } catch {
      throw new AppError(
        "UPLOADCARE_FAILURE",
        "Uploadcare returned an invalid original file URL.",
        502,
      );
    }

    if (parsed.protocol !== "https:") {
      throw new AppError(
        "UPLOADCARE_FAILURE",
        "Uploadcare original file URL must use HTTPS.",
        502,
      );
    }

    if (!isTrustedUploadcareHost(parsed.hostname)) {
      throw new AppError(
        "UPLOADCARE_FAILURE",
        "Uploadcare original file URL host is not a trusted CDN host.",
        502,
      );
    }

    if (!parsed.pathname.includes(fileInfo.uuid)) {
      throw new AppError(
        "UPLOADCARE_FAILURE",
        "Uploadcare original file URL does not match the file UUID.",
        502,
      );
    }

    return parsed.toString();
  }

  // Fallback for accounts that still serve the legacy CDN form.
  return `https://ucarecdn.com/${fileInfo.uuid}/`;
}

/**
 * @deprecated Prefer resolveTrustedUploadcareCdnUrl(fileInfo) which uses
 * Uploadcare REST `original_file_url` when available.
 */
export function buildUploadcareCdnUrl(uuid: string): string {
  return `https://ucarecdn.com/${uuid}/`;
}

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
