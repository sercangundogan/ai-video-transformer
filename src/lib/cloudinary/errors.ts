import "server-only";

/**
 * Strips query strings from URLs embedded in provider messages so signed
 * tokens or temporary credentials are not written to logs.
 */
function sanitizeProviderMessage(message: string): string {
  return message.replace(/([?&])([^=\s]+)=([^&\s]+)/g, "$1$2=[redacted]");
}

/**
 * Extracts safe, non-secret fields from Cloudinary SDK / HTTP errors.
 */
export function extractCloudinaryErrorDetails(error: unknown): {
  message?: string;
  name?: string;
  httpCode?: number;
  code?: string | number;
  requestId?: string;
} {
  if (!error || typeof error !== "object") {
    return {
      message:
        typeof error === "string" ? sanitizeProviderMessage(error) : undefined,
    };
  }

  const record = error as Record<string, unknown>;

  const rawMessage =
    typeof record.message === "string"
      ? record.message
      : typeof record.error === "object" &&
          record.error !== null &&
          typeof (record.error as Record<string, unknown>).message === "string"
        ? ((record.error as Record<string, unknown>).message as string)
        : undefined;

  const httpCode =
    typeof record.http_code === "number"
      ? record.http_code
      : typeof record.httpCode === "number"
        ? record.httpCode
        : undefined;

  const code =
    typeof record.code === "string" || typeof record.code === "number"
      ? record.code
      : undefined;

  const name = typeof record.name === "string" ? record.name : undefined;
  const requestId =
    typeof record.request_id === "string" ? record.request_id : undefined;

  return {
    message: rawMessage ? sanitizeProviderMessage(rawMessage) : undefined,
    name,
    httpCode,
    code,
    requestId,
  };
}

/**
 * Production-appropriate Cloudinary failure logging.
 * Includes operation context and provider error fields; never logs secrets.
 */
export function logCloudinaryFailure(options: {
  operation: string;
  uploadcareUuid?: string;
  publicId?: string;
  sourceHost?: string;
  error: unknown;
}): void {
  const details = extractCloudinaryErrorDetails(options.error);

  console.error("[cloudinary] operation failed", {
    operation: options.operation,
    uploadcareUuid: options.uploadcareUuid,
    publicId: options.publicId,
    sourceHost: options.sourceHost,
    cloudinary: {
      message: details.message,
      name: details.name,
      http_code: details.httpCode,
      code: details.code,
      request_id: details.requestId,
    },
  });
}
