import { NextResponse } from "next/server";

import { AppError, handleRouteError } from "@/lib/errors";
import {
  transformRequestSchema,
  type TransformResponse,
} from "@/schemas/transform";
import { startTransformation } from "@/services/start-transformation";

export const runtime = "nodejs";

export async function POST(
  request: Request,
): Promise<NextResponse<TransformResponse | { error: unknown }>> {
  try {
    const json: unknown = await request.json();
    const parsed = transformRequestSchema.safeParse(json);

    if (!parsed.success) {
      throw new AppError(
        "INVALID_REQUEST",
        "Invalid transformation request.",
        400,
        { issueCount: parsed.error.issues.length },
      );
    }

    const result = await startTransformation({
      transformationId: parsed.data.transformationId,
      parameters: parsed.data.parameters,
    });

    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    return handleRouteError(error);
  }
}
