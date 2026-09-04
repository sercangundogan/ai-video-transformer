"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";

import {
  Field,
  SectionCard,
  StatusBadge,
  controlClassName,
  primaryButtonClassName,
} from "@/components/ui/primitives";
import {
  MAGIC_HOUR_ART_STYLES,
  MAGIC_HOUR_FPS_RESOLUTIONS,
  MAGIC_HOUR_MODELS,
  MAGIC_HOUR_PROMPT_TYPES,
  MAGIC_HOUR_VERSIONS,
} from "@/lib/magic-hour/enums";
import {
  transformParametersInputSchema,
  type TransformParametersInput,
  type TransformResponse,
} from "@/schemas/transform";
import type { ApiErrorBody } from "@/types/api";

type TransformFormProps = {
  transformationId: string;
  sourceDurationSeconds?: number;
  sourcePreviewUrl: string;
  sourceFilename?: string;
  onQueued?: (data: TransformResponse) => void;
};

type FormState = {
  name: string;
  startSeconds: string;
  endSeconds: string;
  fpsResolution: (typeof MAGIC_HOUR_FPS_RESOLUTIONS)[number];
  artStyle: (typeof MAGIC_HOUR_ART_STYLES)[number];
  version: (typeof MAGIC_HOUR_VERSIONS)[number];
  promptType: (typeof MAGIC_HOUR_PROMPT_TYPES)[number];
  prompt: string;
  model: (typeof MAGIC_HOUR_MODELS)[number];
};

function defaultEndSeconds(duration?: number): string {
  if (duration !== undefined && Number.isFinite(duration) && duration > 0) {
    return String(Math.min(15, Math.round(duration * 100) / 100));
  }
  return "5";
}

const VERSION_HINTS: Record<FormState["version"], string> = {
  v2: "Faster and usually more consistent. Recommended default.",
  v1: "More detail and stronger prompt adherence; may be slower.",
  default:
    "Uses Magic Hour’s style default. Some styles currently resolve to unavailable V3 models.",
};

const PROMPT_TYPE_HINTS: Record<FormState["promptType"], string> = {
  default: "Uses Magic Hour’s recommended prompt for the selected art style.",
  custom: "Only your prompt is used (style LoRA may still apply on v1).",
  append_default:
    "Your prompt is appended to the style’s recommended prompt.",
};

export function TransformForm({
  transformationId,
  sourceDurationSeconds,
  sourcePreviewUrl,
  sourceFilename,
  onQueued,
}: TransformFormProps) {
  const [form, setForm] = useState<FormState>({
    name: "",
    startSeconds: "0",
    endSeconds: defaultEndSeconds(sourceDurationSeconds),
    fpsResolution: "HALF",
    artStyle: "Studio Ghibli",
    version: "v2",
    promptType: "default",
    prompt: "",
    model: "default",
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TransformResponse | null>(null);
  const [isPending, startTransition] = useTransition();

  const promptRequired =
    form.promptType === "custom" || form.promptType === "append_default";

  const durationHint = useMemo(() => {
    if (sourceDurationSeconds === undefined) {
      return "Source duration unavailable; the server still validates the trim window.";
    }
    return `Source is ${sourceDurationSeconds.toFixed(2)}s long. End must stay within that window.`;
  }, [sourceDurationSeconds]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function buildParameters(): TransformParametersInput | null {
    const parsed = transformParametersInputSchema.safeParse({
      name: form.name.trim() ? form.name.trim() : undefined,
      startSeconds: Number(form.startSeconds),
      endSeconds: Number(form.endSeconds),
      fpsResolution: form.fpsResolution,
      style: {
        artStyle: form.artStyle,
        version: form.version,
        promptType: form.promptType,
        prompt: promptRequired ? form.prompt.trim() : null,
        model: form.model,
      },
    });

    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path.join(".") || "form";
        if (!nextErrors[key]) {
          nextErrors[key] = issue.message;
        }
      }
      setFieldErrors(nextErrors);
      return null;
    }

    setFieldErrors({});
    return parsed.data;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const parameters = buildParameters();
    if (!parameters) {
      setError("Please fix the highlighted form fields.");
      return;
    }

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/transform", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              transformationId,
              parameters,
            }),
          });

          const body: unknown = await response.json();
          if (!response.ok) {
            const errorBody = body as ApiErrorBody;
            throw new Error(
              errorBody.error?.message ?? "Failed to start transformation.",
            );
          }

          setResult(body as TransformResponse);
          onQueued?.(body as TransformResponse);
        } catch (submitError) {
          setResult(null);
          setError(
            submitError instanceof Error
              ? submitError.message
              : "Failed to start transformation.",
          );
        }
      })();
    });
  }

  const disabled = isPending || result !== null;

  return (
    <SectionCard
      id="transform"
      step="02"
      title="Transform settings"
      description="The source file is taken from your uploaded record — you don’t paste provider URLs here."
      action={result ? <StatusBadge status="queued" pulsing /> : null}
      emphasized
    >
      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-[#07090e]">
        <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          <p className="text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
            Source preview
          </p>
          {sourceFilename ? (
            <p
              className="max-w-[60%] truncate text-xs text-muted"
              title={sourceFilename}
            >
              {sourceFilename}
            </p>
          ) : null}
        </div>
        <video
          className="aspect-video w-full object-contain"
          controls
          preload="metadata"
          src={sourcePreviewUrl}
        >
          Your browser does not support the video tag.
        </video>
      </div>

      <form className="flex flex-col gap-6" onSubmit={onSubmit} noValidate>
        <Field
          label="Name (optional)"
          htmlFor="transform-name"
          hint="Shown in history. Defaults to the source filename if left blank."
        >
          <input
            id="transform-name"
            className={controlClassName}
            value={form.name}
            disabled={disabled}
            autoComplete="off"
            onChange={(event) => updateField("name", event.target.value)}
          />
        </Field>

        <fieldset className="flex flex-col gap-4 rounded-xl border border-border bg-surface-muted/40 p-4">
          <legend className="px-1 text-[11px] font-semibold tracking-[0.14em] text-cyan uppercase">
            Clip
          </legend>
          <p className="text-xs leading-5 text-muted">{durationHint}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Start (seconds)"
              htmlFor="transform-start"
              error={fieldErrors.startSeconds}
            >
              <input
                id="transform-start"
                type="number"
                min={0}
                step="0.1"
                className={controlClassName}
                value={form.startSeconds}
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.startSeconds)}
                aria-describedby={
                  fieldErrors.startSeconds ? "transform-start-error" : undefined
                }
                onChange={(event) =>
                  updateField("startSeconds", event.target.value)
                }
              />
            </Field>
            <Field
              label="End (seconds)"
              htmlFor="transform-end"
              error={fieldErrors.endSeconds}
            >
              <input
                id="transform-end"
                type="number"
                min={0.1}
                step="0.1"
                className={controlClassName}
                value={form.endSeconds}
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors.endSeconds)}
                aria-describedby={
                  fieldErrors.endSeconds ? "transform-end-error" : undefined
                }
                onChange={(event) =>
                  updateField("endSeconds", event.target.value)
                }
              />
            </Field>
          </div>
          <Field
            label="FPS resolution"
            htmlFor="transform-fps"
            hint="HALF is usually enough and uses fewer credits than FULL."
          >
            <select
              id="transform-fps"
              className={controlClassName}
              value={form.fpsResolution}
              disabled={disabled}
              onChange={(event) =>
                updateField(
                  "fpsResolution",
                  event.target.value as FormState["fpsResolution"],
                )
              }
            >
              {MAGIC_HOUR_FPS_RESOLUTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>

        <fieldset className="flex flex-col gap-4 rounded-xl border border-border bg-surface-muted/40 p-4">
          <legend className="px-1 text-[11px] font-semibold tracking-[0.14em] text-accent uppercase">
            Style
          </legend>

          <Field
            label="Art style"
            htmlFor="transform-art-style"
            error={fieldErrors["style.artStyle"]}
          >
            <select
              id="transform-art-style"
              className={controlClassName}
              value={form.artStyle}
              disabled={disabled}
              aria-invalid={Boolean(fieldErrors["style.artStyle"])}
              onChange={(event) =>
                updateField(
                  "artStyle",
                  event.target.value as FormState["artStyle"],
                )
              }
            >
              {MAGIC_HOUR_ART_STYLES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Model"
              htmlFor="transform-model"
              hint="Leave on default unless you need a specific look."
            >
              <select
                id="transform-model"
                className={controlClassName}
                value={form.model}
                disabled={disabled}
                onChange={(event) =>
                  updateField("model", event.target.value as FormState["model"])
                }
              >
                {MAGIC_HOUR_MODELS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Version"
              htmlFor="transform-version"
              hint={VERSION_HINTS[form.version]}
            >
              <select
                id="transform-version"
                className={controlClassName}
                value={form.version}
                disabled={disabled}
                onChange={(event) =>
                  updateField(
                    "version",
                    event.target.value as FormState["version"],
                  )
                }
              >
                {MAGIC_HOUR_VERSIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field
            label="Prompt type"
            htmlFor="transform-prompt-type"
            hint={PROMPT_TYPE_HINTS[form.promptType]}
          >
            <select
              id="transform-prompt-type"
              className={controlClassName}
              value={form.promptType}
              disabled={disabled}
              onChange={(event) =>
                updateField(
                  "promptType",
                  event.target.value as FormState["promptType"],
                )
              }
            >
              {MAGIC_HOUR_PROMPT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </Field>

          {promptRequired ? (
            <Field
              label="Prompt"
              htmlFor="transform-prompt"
              error={fieldErrors["style.prompt"]}
              hint="Required for custom and append_default prompt types."
            >
              <textarea
                id="transform-prompt"
                className={`${controlClassName} min-h-28`}
                value={form.prompt}
                disabled={disabled}
                aria-invalid={Boolean(fieldErrors["style.prompt"])}
                aria-describedby={
                  fieldErrors["style.prompt"]
                    ? "transform-prompt-error"
                    : undefined
                }
                onChange={(event) => updateField("prompt", event.target.value)}
              />
            </Field>
          ) : null}
        </fieldset>

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-muted">
            After submit, watch History for queued → processing → completed. You
            can leave this page; state is saved.
          </p>
          <button
            type="submit"
            disabled={disabled}
            className={primaryButtonClassName}
          >
            {isPending
              ? "Starting…"
              : result
                ? "Queued"
                : "Start transformation"}
          </button>
        </div>
      </form>

      {error ? (
        <p
          className="mt-4 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {result ? (
        <div
          className="mt-4 rounded-xl border border-info/20 bg-info-soft px-4 py-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-info">
            Transformation queued
          </p>
          <p className="mt-1 text-sm leading-6 text-foreground/90">
            Magic Hour accepted the job
            {typeof result.transformation.magicHour.creditsCharged === "number"
              ? ` (${result.transformation.magicHour.creditsCharged} credits)`
              : ""}
            . History below updates automatically as rendering progresses.
          </p>
        </div>
      ) : null}
    </SectionCard>
  );
}
