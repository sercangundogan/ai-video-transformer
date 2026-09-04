import { NextResponse } from "next/server";

import { AppError, handleRouteError } from "@/lib/errors";
import {
  historyQuerySchema,
  type HistoryResponse,
} from "@/schemas/history";
import { listTransformationHistory } from "@/services/list-history";

export const runtime = "nodejs";

export async function GET(
  request: Request,
): Promise<NextResponse<HistoryResponse | { error: unknown }>> {
  try {
    const url = new URL(request.url);
    const parsed = historyQuerySchema.safeParse({
      limit: url.searchParams.get("limit") ?? undefined,
    });

    if (!parsed.success) {
      throw new AppError(
        "INVALID_REQUEST",
        "Invalid history query parameters.",
        400,
        { issueCount: parsed.error.issues.length },
      );
    }

    const result = await listTransformationHistory({
      limit: parsed.data.limit,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    return handleRouteError(error);
  }
}
