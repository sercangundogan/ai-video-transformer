import { NextResponse } from "next/server";

import { AppError, handleRouteError } from "@/lib/errors";
import { uploadRequestSchema, type UploadResponse } from "@/schemas/upload";
import { registerUploadedSourceVideo } from "@/services/upload-source-video";

export const runtime = "nodejs";
/** Cloudinary remote video fetch can exceed the default serverless window. */
export const maxDuration = 60;

export async function POST(
  request: Request,
): Promise<NextResponse<UploadResponse | { error: unknown }>> {
  try {
    const json: unknown = await request.json();
    const parsed = uploadRequestSchema.safeParse(json);

    if (!parsed.success) {
      throw new AppError(
        "INVALID_REQUEST",
        "Request body must include a valid Uploadcare file UUID.",
        400,
        parsed.error.issues,
      );
    }

    const result = await registerUploadedSourceVideo(parsed.data.uuid);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleRouteError(error);
  }
}
