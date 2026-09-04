import type { TransformationStatus } from "@/types/transformation";

/**
 * Queued rows without a persisted Magic Hour projectId may be reclaimed only
 * after this age. Prevents concurrent double-starts during an in-flight create.
 */
export const STALE_QUEUED_CLAIM_MS = 90_000;

export function isStaleQueuedClaim(
  queuedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!queuedAt) {
    return true;
  }

  return now.getTime() - queuedAt.getTime() >= STALE_QUEUED_CLAIM_MS;
}

/**
 * Whether a transformation may start (or reclaim) a Magic Hour job.
 * Stuck `queued` rows without a persisted projectId may be reclaimed after a
 * crash between Magic Hour create and Mongo persistence — but only once stale.
 */
export function canStartTransformation(options: {
  status: TransformationStatus;
  hasMagicHourProjectId: boolean;
  queuedAt?: Date | null;
  now?: Date;
}): boolean {
  if (options.status === "uploaded" || options.status === "failed") {
    return true;
  }

  if (options.status === "queued" && !options.hasMagicHourProjectId) {
    return isStaleQueuedClaim(options.queuedAt, options.now);
  }

  return false;
}

export function startConflictMessage(status: TransformationStatus): string {
  if (status === "queued" || status === "processing") {
    return "This transformation is already in progress.";
  }

  if (status === "completed") {
    return "This transformation has already completed.";
  }

  return "This transformation cannot be started in its current state.";
}
