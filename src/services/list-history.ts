import "server-only";

import { getTransformationsCollection } from "@/models/transformation";
import { toHistoryItem } from "@/lib/history/map-item";
import {
  HISTORY_DEFAULT_LIMIT,
  type HistoryResponse,
} from "@/schemas/history";
import { ACTIVE_TRANSFORMATION_STATUSES } from "@/schemas/transformation";

export { toHistoryItem } from "@/lib/history/map-item";

export async function listTransformationHistory(options?: {
  limit?: number;
}): Promise<HistoryResponse> {
  const limit = options?.limit ?? HISTORY_DEFAULT_LIMIT;
  const collection = await getTransformationsCollection();

  const docs = await collection
    .find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray();

  const transformations = docs.map(toHistoryItem);
  const hasActive = transformations.some((item) =>
    (ACTIVE_TRANSFORMATION_STATUSES as readonly string[]).includes(item.status),
  );

  return {
    transformations,
    meta: {
      limit,
      count: transformations.length,
      hasActive,
    },
  };
}
