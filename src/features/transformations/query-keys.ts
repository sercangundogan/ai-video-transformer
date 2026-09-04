import { HISTORY_DEFAULT_LIMIT } from "@/schemas/history";

export const transformationHistoryQueryKey = [
  "transformations",
  "history",
  { limit: HISTORY_DEFAULT_LIMIT },
] as const;
