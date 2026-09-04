"use client";

import { useTransformationHistory } from "@/features/transformations/use-transformation-history";
import type { HistoryItem } from "@/schemas/history";
import { ACTIVE_TRANSFORMATION_STATUSES } from "@/types/transformation";

const LONG_RUNNING_MS = 2 * 60 * 1000;

function formatTimestamp(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function statusLabel(status: HistoryItem["status"]): string {
  switch (status) {
    case "uploaded":
      return "Uploaded";
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

function isLongRunning(item: HistoryItem, nowMs: number): boolean {
  if (
    !(ACTIVE_TRANSFORMATION_STATUSES as readonly string[]).includes(item.status)
  ) {
    return false;
  }

  const startedAt = item.queuedAt ?? item.createdAt;
  const startedMs = Date.parse(startedAt);
  if (!Number.isFinite(startedMs)) {
    return false;
  }

  return nowMs - startedMs >= LONG_RUNNING_MS;
}

function HistoryCard({ item, nowMs }: { item: HistoryItem; nowMs: number }) {
  const created = formatTimestamp(item.createdAt);
  const queued = formatTimestamp(item.queuedAt);
  const completed = formatTimestamp(item.completedAt);
  const failed = formatTimestamp(item.failedAt);
  const longRunning = isLongRunning(item, nowMs);

  return (
    <article className="flex flex-col gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            {item.parameters?.name ?? item.source.filename}
          </p>
          <p className="text-xs text-zinc-500">
            Status: {statusLabel(item.status)}
          </p>
        </div>
        {created ? (
          <p className="text-xs text-zinc-500">Created {created}</p>
        ) : null}
      </div>

      {item.parameters ? (
        <dl className="grid gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Art style
            </dt>
            <dd>{item.parameters.style.artStyle}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Version
            </dt>
            <dd>{item.parameters.style.version}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              Trim
            </dt>
            <dd>
              {item.parameters.startSeconds}s – {item.parameters.endSeconds}s
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-zinc-500">
              FPS
            </dt>
            <dd>{item.parameters.fpsResolution}</dd>
          </div>
        </dl>
      ) : (
        <p className="text-sm text-zinc-500">
          Source uploaded. Transformation parameters not submitted yet.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            Source
          </p>
          <video
            className="aspect-video w-full bg-zinc-100 object-contain dark:bg-zinc-900"
            controls
            preload="metadata"
            src={item.source.secureUrl}
          >
            Your browser does not support the video tag.
          </video>
        </div>

        {item.status === "completed" && item.output ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Generated
            </p>
            <video
              className="aspect-video w-full bg-zinc-100 object-contain dark:bg-zinc-900"
              controls
              preload="metadata"
              src={item.output.secureUrl}
            >
              Your browser does not support the video tag.
            </video>
          </div>
        ) : null}
      </div>

      {item.status === "queued" || item.status === "processing" ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {item.status === "queued"
            ? "Waiting for Magic Hour to start rendering…"
            : "Magic Hour is rendering this video…"}
          {queued ? ` Queued ${queued}.` : null}
        </p>
      ) : null}

      {longRunning ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          This is taking longer than usual; you can safely come back later.
        </p>
      ) : null}

      {item.status === "failed" && item.failure ? (
        <div className="text-sm text-red-700 dark:text-red-400">
          <p className="font-medium">{item.failure.message}</p>
          <p className="text-xs opacity-80">Code: {item.failure.code}</p>
          {failed ? <p className="text-xs opacity-80">Failed {failed}</p> : null}
        </div>
      ) : null}

      {item.status === "completed" && completed ? (
        <p className="text-xs text-zinc-500">Completed {completed}</p>
      ) : null}
    </article>
  );
}

export function TransformationHistory() {
  const query = useTransformationHistory();
  // Use query refresh time so long-running checks stay pure during render.
  const nowMs = query.dataUpdatedAt;

  if (query.isPending) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          History
        </h2>
        <p className="text-sm text-zinc-500">Loading transformation history…</p>
      </section>
    );
  }

  if (query.isError) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
          History
        </h2>
        <p className="text-sm text-red-700 dark:text-red-400">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load history."}
        </p>
        <button
          type="button"
          className="w-fit text-sm underline"
          onClick={() => {
            void query.refetch();
          }}
        >
          Retry
        </button>
      </section>
    );
  }

  const items = query.data.transformations;

  return (
    <section className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            History
          </h2>
          <p className="text-sm text-zinc-500">
            Newest first.{" "}
            {query.data.meta.hasActive
              ? "Polling while jobs are queued or processing."
              : "Polling paused — no active jobs."}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No transformations yet. Upload a video to get started.
        </p>
      ) : (
        <div className="flex flex-col gap-6">
          {items.map((item) => (
            <HistoryCard key={item.id} item={item} nowMs={nowMs} />
          ))}
        </div>
      )}
    </section>
  );
}
