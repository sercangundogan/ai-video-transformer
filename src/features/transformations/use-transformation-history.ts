"use client";

import { useQuery } from "@tanstack/react-query";

import { transformationHistoryQueryKey } from "@/features/transformations/query-keys";
import {
  HISTORY_DEFAULT_LIMIT,
  historyResponseSchema,
  type HistoryResponse,
} from "@/schemas/history";
import type { ApiErrorBody } from "@/types/api";

const ACTIVE_POLL_INTERVAL_MS = 3_000;

async function fetchHistory(): Promise<HistoryResponse> {
  const response = await fetch(
    `/api/history?limit=${HISTORY_DEFAULT_LIMIT}`,
    {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    },
  );

  const json: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const body = json as ApiErrorBody | null;
    throw new Error(
      body?.error?.message ?? "Failed to load transformation history.",
    );
  }

  const parsed = historyResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error("History response was invalid.");
  }

  return parsed.data;
}

/**
 * Loads transformation history and polls every ~3s while any job is active.
 */
export function useTransformationHistory() {
  return useQuery({
    queryKey: transformationHistoryQueryKey,
    queryFn: fetchHistory,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data?.meta.hasActive) {
        return false;
      }
      return ACTIVE_POLL_INTERVAL_MS;
    },
  });
}
