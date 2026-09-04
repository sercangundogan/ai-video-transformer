"use client";

import {
  SectionCard,
  StatusBadge,
  secondaryButtonClassName,
} from "@/components/ui/primitives";
import {
  formatTimestamp,
  truncateFilename,
} from "@/features/transformations/status";
import { useTransformationHistory } from "@/features/transformations/use-transformation-history";
import type { HistoryItem } from "@/schemas/history";
import { ACTIVE_TRANSFORMATION_STATUSES } from "@/types/transformation";

const LONG_RUNNING_MS = 2 * 60 * 1000;

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

function parameterSummary(item: HistoryItem): string | null {
  if (!item.parameters) {
    return null;
  }

  const { style, startSeconds, endSeconds, fpsResolution } = item.parameters;
  const parts = [
    style.artStyle,
    style.version,
    `${startSeconds}–${endSeconds}s`,
    `FPS ${fpsResolution}`,
  ];

  if (style.model !== "default") {
    parts.push(style.model);
  }

  if (style.promptType !== "default") {
    parts.push(`prompt: ${style.promptType}`);
  }

  return parts.join(" · ");
}

function VideoPanel({
  label,
  src,
  tone,
}: {
  label: string;
  src: string;
  tone: "source" | "generated";
}) {
  const isGenerated = tone === "generated";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
          {label}
        </p>
        <span
          className={
            isGenerated
              ? "rounded-md border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase"
              : "rounded-md border border-border bg-surface-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted uppercase"
          }
        >
          {isGenerated ? "Generated" : "Source"}
        </span>
      </div>
      <div
        className={`overflow-hidden rounded-xl border bg-[#07090e] ${
          isGenerated ? "border-accent/25" : "border-border"
        }`}
      >
        <video
          className="aspect-video w-full object-contain"
          controls
          preload="metadata"
          src={src}
        >
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  );
}

function HistoryCard({ item, nowMs }: { item: HistoryItem; nowMs: number }) {
  const title = item.parameters?.name ?? item.source.filename;
  const created = formatTimestamp(item.createdAt);
  const queued = formatTimestamp(item.queuedAt);
  const completed = formatTimestamp(item.completedAt);
  const failed = formatTimestamp(item.failedAt);
  const longRunning = isLongRunning(item, nowMs);
  const summary = parameterSummary(item);
  const isActive = (ACTIVE_TRANSFORMATION_STATUSES as readonly string[]).includes(
    item.status,
  );
  const output = item.output;
  const isCompleted = item.status === "completed" && Boolean(output);

  return (
    <article
      className={`rounded-xl border p-4 sm:p-5 ${
        isCompleted
          ? "border-accent/20 bg-surface-elevated"
          : "border-border bg-surface-muted/50"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3
            className="truncate text-base font-semibold text-foreground"
            title={title}
          >
            {truncateFilename(title, 56)}
          </h3>
          {summary ? (
            <p className="mt-1 text-sm leading-6 text-muted">{summary}</p>
          ) : (
            <p className="mt-1 text-sm text-muted">
              Uploaded source — transform settings not submitted yet.
            </p>
          )}
        </div>
        <StatusBadge status={item.status} pulsing={isActive} />
      </div>

      <div
        className={`mt-4 grid gap-4 ${
          isCompleted ? "lg:grid-cols-[0.9fr_1.1fr]" : "lg:grid-cols-2"
        }`}
      >
        <VideoPanel label="Source" src={item.source.secureUrl} tone="source" />
        {isCompleted && output ? (
          <VideoPanel
            label="Generated"
            src={output.secureUrl}
            tone="generated"
          />
        ) : (
          <div className="flex min-h-40 flex-col justify-center rounded-xl border border-dashed border-border bg-[#07090e]/60 px-4 py-6 text-sm text-muted">
            {item.status === "queued" ? (
              <p>
                Waiting for Magic Hour to start rendering
                {queued ? ` (queued ${queued})` : ""}.
              </p>
            ) : null}
            {item.status === "processing" ? (
              <p>Magic Hour is rendering this clip…</p>
            ) : null}
            {item.status === "uploaded" ? (
              <p>Generated video will appear here after a successful job.</p>
            ) : null}
            {item.status === "failed" ? (
              <p>No generated video — this job failed.</p>
            ) : null}
          </div>
        )}
      </div>

      {longRunning ? (
        <p
          className="mt-4 rounded-lg border border-warning/20 bg-warning-soft px-3 py-2 text-sm text-warning"
          role="status"
        >
          This is taking longer than usual. You can safely leave and come back
          later — progress is saved.
        </p>
      ) : null}

      {item.status === "failed" && item.failure ? (
        <div
          className="mt-4 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger"
          role="alert"
        >
          <p className="font-semibold">{item.failure.message}</p>
          <p className="mt-1 text-xs opacity-90">
            {item.failure.code}
            {failed ? ` · Failed ${failed}` : ""}
          </p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted">
        {created ? <span>Created {created}</span> : null}
        {item.status === "completed" && completed ? (
          <span>Completed {completed}</span>
        ) : null}
        <span className="min-w-0 truncate" title={item.source.filename}>
          File {truncateFilename(item.source.filename)}
        </span>
      </div>
    </article>
  );
}

export function TransformationHistory() {
  const query = useTransformationHistory();
  const nowMs = query.dataUpdatedAt;

  if (query.isPending) {
    return (
      <SectionCard
        id="history"
        step="03"
        title="History"
        description="Loading your saved transformations…"
      >
        <p
          className="flex items-center gap-2 text-sm text-muted"
          aria-live="polite"
        >
          <span
            className="size-2 animate-pulse rounded-full bg-accent"
            aria-hidden
          />
          Fetching history…
        </p>
      </SectionCard>
    );
  }

  if (query.isError) {
    return (
      <SectionCard id="history" step="03" title="History">
        <p
          className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load history."}
        </p>
        <button
          type="button"
          className={`${secondaryButtonClassName} mt-3`}
          onClick={() => {
            void query.refetch();
          }}
        >
          Retry loading history
        </button>
      </SectionCard>
    );
  }

  const items = query.data.transformations;

  return (
    <SectionCard
      id="history"
      step="03"
      title="History"
      description={
        query.data.meta.hasActive
          ? "Newest first. Live updates every few seconds while jobs are queued or processing."
          : "Newest first. Live updates pause when nothing is in progress — refresh anytime."
      }
      action={
        query.data.meta.hasActive ? (
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-accent">
            <span
              className="size-1.5 animate-pulse rounded-full bg-accent"
              aria-hidden
            />
            Syncing
          </span>
        ) : null
      }
    >
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface-muted/30 px-4 py-10 text-center">
          <p className="text-sm font-medium text-foreground">
            No transformations yet
          </p>
          <p className="mt-1 text-sm text-muted">
            Upload a video above to create your first history item.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <HistoryCard key={item.id} item={item} nowMs={nowMs} />
          ))}
        </div>
      )}
    </SectionCard>
  );
}
