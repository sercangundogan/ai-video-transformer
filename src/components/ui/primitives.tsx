import type { ReactNode } from "react";

import {
  statusLabel,
  statusTone,
} from "@/features/transformations/status";
import type { TransformationStatus } from "@/types/transformation";

const TONE_CLASS: Record<
  ReturnType<typeof statusTone>,
  string
> = {
  neutral: "bg-surface-muted text-foreground",
  info: "bg-info-soft text-info",
  accent: "bg-accent-soft text-accent",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
};

type StatusBadgeProps = {
  status: TransformationStatus;
  pulsing?: boolean;
};

export function StatusBadge({ status, pulsing = false }: StatusBadgeProps) {
  const tone = statusTone(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide ${TONE_CLASS[tone]}`}
    >
      {pulsing ? (
        <span
          className="size-1.5 animate-pulse rounded-full bg-current"
          aria-hidden
        />
      ) : null}
      {statusLabel(status)}
    </span>
  );
}

type SectionCardProps = {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
};

export function SectionCard({
  id,
  title,
  description,
  action,
  children,
}: SectionCardProps) {
  return (
    <section
      id={id}
      className="rounded-2xl border border-border bg-surface p-5 shadow-panel sm:p-6"
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2
            id={id ? `${id}-title` : undefined}
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

type FieldProps = {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
};

export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </label>
      {children}
      {hint && !error ? (
        <p id={hintId} className="text-xs leading-5 text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-xs leading-5 text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const controlClassName =
  "w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-sm transition disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70";

export const primaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

export const secondaryButtonClassName =
  "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition hover:bg-surface-muted";
