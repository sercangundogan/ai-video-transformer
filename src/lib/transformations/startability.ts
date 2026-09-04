import type { TransformationStatus } from "@/types/transformation";

/**
 * Whether a transformation may start (or reclaim) a Magic Hour job.
 * Stuck `queued` rows without a persisted projectId may be reclaimed after a
 * crash between Magic Hour create and Mongo persistence.
 */
export function canStartTransformation(options: {
  status: TransformationStatus;
  hasMagicHourProjectId: boolean;
}): boolean {
  if (options.status === "uploaded" || options.status === "failed") {
    return true;
  }

  if (options.status === "queued" && !options.hasMagicHourProjectId) {
    return true;
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
