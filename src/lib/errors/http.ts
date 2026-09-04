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

function safeErrorSummary(error: unknown): {
  name?: string;
  message?: string;
} {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  return {};
}

/**
 * Maps unknown route failures to a stable client-safe error envelope.
 * Logs only structured, non-sensitive server diagnostics.
 */
export function handleRouteError(error: unknown): NextResponse<ApiErrorBody> {
  if (isAppError(error)) {
    console.error("[api] Application error", {
      code: error.code,
      status: error.status,
      message: error.message,
    });

    return appErrorResponse(error);
  }

  if (error instanceof ZodError) {
    console.error("[api] Request validation failed", {
      issueCount: error.issues.length,
    });

    return errorResponse(
      "INVALID_REQUEST",
      "Request validation failed.",
      400,
    );
  }

  console.error("[api] Unhandled route error", safeErrorSummary(error));

  return errorResponse(
    "INTERNAL_ERROR",
    "An unexpected error occurred.",
    500,
  );
}
