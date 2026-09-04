import { z } from "zod";

import { AppError } from "@/lib/errors";

export const uploadcareFileInfoSchema = z.object({
  uuid: z.string().min(1),
  mime_type: z.string().min(1),
  original_filename: z.string().min(1),
  size: z.number().int().nonnegative(),
  is_ready: z.boolean(),
  is_image: z.boolean(),
  original_file_url: z.url().nullable().optional(),
});

export type UploadcareFileInfo = z.infer<typeof uploadcareFileInfoSchema>;

export function isTrustedUploadcareHost(hostname: string): boolean {
  return (
    hostname === "ucarecdn.com" ||
    hostname.endsWith(".ucarecdn.com") ||
    hostname.endsWith(".ucarecd.net")
  );
}

/**
 * Resolves a Cloudinary-fetchable CDN URL from trusted Uploadcare REST metadata.
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

  return `https://ucarecdn.com/${fileInfo.uuid}/`;
}

/**
 * @deprecated Prefer resolveTrustedUploadcareCdnUrl(fileInfo).
 */
export function buildUploadcareCdnUrl(uuid: string): string {
  return `https://ucarecdn.com/${uuid}/`;
}
