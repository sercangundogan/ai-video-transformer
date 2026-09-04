import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { AppError, isAppError } from "@/lib/errors/app-error";
import type { ApiErrorBody } from "@/types/api";

export function errorResponse(
  code: AppError["code"],
  message: string,
  status: number,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

export function appErrorResponse(error: AppError): NextResponse<ApiErrorBody> {
  return errorResponse(error.code, error.message, error.status);
}

/**
 * Maps unknown route failures to a stable client-safe error envelope.
 * Logs server-side context without returning stack traces to the client.
 */
export function handleRouteError(error: unknown): NextResponse<ApiErrorBody> {
  if (isAppError(error)) {
    return appErrorResponse(error);
  }

  if (error instanceof ZodError) {
    return errorResponse(
      "INVALID_REQUEST",
      "Request validation failed.",
      400,
    );
  }

  console.error("[api] Unhandled route error", error);

  return errorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred.",
    500,
  );
}
