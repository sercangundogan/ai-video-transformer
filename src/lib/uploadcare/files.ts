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

/**
 * Builds the canonical Uploadcare CDN URL for a UUID.
 * We never trust a client-supplied arbitrary remote URL for Cloudinary fetch.
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
    throw new AppError(
      "UPLOADCARE_FAILURE",
      "Failed to verify the Uploadcare file metadata.",
      502,
      { status: response.status },
    );
  }

  const json: unknown = await response.json();
  const parsed = uploadcareFileInfoSchema.safeParse(json);

  if (!parsed.success) {
    throw new AppError(
      "UPLOADCARE_FAILURE",
      "Uploadcare returned unexpected file metadata.",
      502,
      parsed.error.issues,
    );
  }

  return parsed.data;
}
