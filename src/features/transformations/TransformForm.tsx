"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";

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

export function TransformForm({
  transformationId,
  sourceDurationSeconds,
  sourcePreviewUrl,
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
      return "Source duration unavailable; server still validates the trim window.";
    }
    return `Source duration: ${sourceDurationSeconds.toFixed(2)}s`;
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
    <section className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Transform video
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Choose Magic Hour Video-to-Video options. The source file is taken
          from the uploaded transformation — not from a client URL.
        </p>
        <p className="text-xs text-zinc-500">{durationHint}</p>
      </div>

      <video
        className="w-full max-w-md rounded-md"
        controls
        preload="metadata"
        src={sourcePreviewUrl}
      >
        <track kind="captions" />
      </video>

      <form className="flex flex-col gap-4" onSubmit={onSubmit} noValidate>
        <label className="flex flex-col gap-1 text-sm">
          <span>Name (optional)</span>
          <input
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={form.name}
            disabled={disabled}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Start seconds</span>
            <input
              type="number"
              min={0}
              step="0.1"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={form.startSeconds}
              disabled={disabled}
              onChange={(event) =>
                updateField("startSeconds", event.target.value)
              }
            />
            {fieldErrors.startSeconds ? (
              <span className="text-xs text-red-600">
                {fieldErrors.startSeconds}
              </span>
            ) : null}
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>End seconds</span>
            <input
              type="number"
              min={0.1}
              step="0.1"
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={form.endSeconds}
              disabled={disabled}
              onChange={(event) => updateField("endSeconds", event.target.value)}
            />
            {fieldErrors.endSeconds ? (
              <span className="text-xs text-red-600">
                {fieldErrors.endSeconds}
              </span>
            ) : null}
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span>FPS resolution</span>
          <select
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
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
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span>Art style</span>
          <select
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={form.artStyle}
            disabled={disabled}
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
          {fieldErrors["style.artStyle"] ? (
            <span className="text-xs text-red-600">
              {fieldErrors["style.artStyle"]}
            </span>
          ) : null}
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span>Model</span>
            <select
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
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
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span>Version</span>
            <select
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
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
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span>Prompt type</span>
          <select
            className="rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
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
        </label>

        {promptRequired ? (
          <label className="flex flex-col gap-1 text-sm">
            <span>Prompt</span>
            <textarea
              className="min-h-24 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={form.prompt}
              disabled={disabled}
              onChange={(event) => updateField("prompt", event.target.value)}
            />
            {fieldErrors["style.prompt"] ? (
              <span className="text-xs text-red-600">
                {fieldErrors["style.prompt"]}
              </span>
            ) : null}
          </label>
        ) : null}

        <button
          type="submit"
          disabled={disabled}
          className="inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {isPending
            ? "Starting transformation…"
            : result
              ? "Transformation queued"
              : "Start transformation"}
        </button>
      </form>

      {error ? (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {error}
        </p>
      ) : null}

      {result ? (
        <div className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            Job accepted (queued)
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Magic Hour project ID:{" "}
            <code className="font-mono text-xs">
              {result.transformation.magicHour.projectId}
            </code>
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Estimated credits:{" "}
            {result.transformation.magicHour.creditsCharged ?? "n/a"}
          </p>
          <p className="text-xs text-zinc-500">
            Completion via webhook lands in Phase 4. Status will stay queued
            until then.
          </p>
        </div>
      ) : null}
    </section>
  );
}
