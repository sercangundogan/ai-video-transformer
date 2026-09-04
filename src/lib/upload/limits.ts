/**
 * Application-level video constraints for the take-home assignment.
 *
 * Binding constraint researched for Phase 2 (see docs/DECISIONS.md DEC-006):
 * Cloudinary Free plan max video file size is 100 MB. Magic Hour Free allows
 * 200 MB uploads. Uploadcare enforces whatever we configure client-side /
 * project-side; it is not the bottleneck here.
 */
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export const ALLOWED_VIDEO_MIME_TYPES = [
  "video/mp4",
  "video/quicktime",
] as const;

export type AllowedVideoMimeType = (typeof ALLOWED_VIDEO_MIME_TYPES)[number];

export const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "mov"] as const;

export const UPLOADCARE_ACCEPT =
  "video/mp4,video/quicktime,.mp4,.mov" as const;

export function isAllowedVideoMimeType(
  mimeType: string,
): mimeType is AllowedVideoMimeType {
  return (ALLOWED_VIDEO_MIME_TYPES as readonly string[]).includes(mimeType);
}

export function hasAllowedVideoExtension(filename: string): boolean {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (!extension) {
    return false;
  }

  return (ALLOWED_VIDEO_EXTENSIONS as readonly string[]).includes(extension);
}
