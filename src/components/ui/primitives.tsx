import type { ReactNode } from "react";

import {
  statusLabel,
  statusTone,
} from "@/features/transformations/status";
import type { TransformationStatus } from "@/types/transformation";

const TONE_CLASS: Record<ReturnType<typeof statusTone>, string> = {
  neutral: "border border-border bg-surface-muted text-muted",
  info: "border border-info/25 bg-info-soft text-info",
  accent: "border border-accent/30 bg-accent-soft text-accent",
  success: "border border-success/25 bg-success-soft text-success",
  danger: "border border-danger/25 bg-danger-soft text-danger",
};

type StatusBadgeProps = {
  status: TransformationStatus;
  pulsing?: boolean;
};

export function StatusBadge({ status, pulsing = false }: StatusBadgeProps) {
  const tone = statusTone(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] uppercase ${TONE_CLASS[tone]}`}
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
  step?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  emphasized?: boolean;
};

export function SectionCard({
  id,
  step,
  title,
  description,
  action,
  children,
  emphasized = false,
}: SectionCardProps) {
  return (
    <section
      id={id}
      className={`rounded-xl border p-4 shadow-panel transition-colors sm:p-6 ${
        emphasized
          ? "border-border-strong bg-surface-elevated"
          : "border-border bg-surface"
      }`}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-3">
            {step ? (
              <span className="font-mono text-[11px] tracking-[0.14em] text-muted/70">
                {step}
              </span>
            ) : null}
            <h2
              id={id ? `${id}-title` : undefined}
              className="text-base font-semibold tracking-tight text-foreground sm:text-lg"
            >
              {title}
            </h2>
          </div>
          {description ? (
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">
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
  "w-full rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-sm text-foreground transition placeholder:text-muted/70 hover:border-border-strong focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-55";

export const primaryButtonClassName =
  "inline-flex h-11 w-full items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-[#0b0d12] transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto";

export const secondaryButtonClassName =
  "inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface-muted px-3 text-sm font-medium text-foreground transition hover:border-border-strong hover:bg-surface-elevated";
