/**
 * Pure helpers for Magic Hour completion download URL trust checks.
 * Kept free of server-only so unit tests can import them.
 */

export function isTrustedMagicHourDownloadHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "videos.magichour.ai" || host.endsWith(".videos.magichour.ai");
}

/**
 * Validates a Magic Hour download URL before Cloudinary remote fetch.
 * Returns a normalized HTTPS URL or throws via the provided error factory.
 */
export function assertTrustedMagicHourDownloadUrl(
  rawUrl: string,
  createError: (message: string) => Error,
): string {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw createError("Magic Hour download URL is invalid.");
  }

  if (parsed.protocol !== "https:") {
    throw createError("Magic Hour download URL must use HTTPS.");
  }

  if (!isTrustedMagicHourDownloadHost(parsed.hostname)) {
    throw createError("Magic Hour download URL host is not trusted.");
  }

  return parsed.toString();
}
