import { z } from "zod";

import {
  MAGIC_HOUR_ART_STYLES,
  MAGIC_HOUR_FPS_RESOLUTIONS,
  MAGIC_HOUR_MODELS,
  MAGIC_HOUR_PROMPT_TYPES,
  MAGIC_HOUR_VERSIONS,
} from "@/lib/magic-hour/enums";

/**
 * User-submitted transformation parameters (camelCase internal DTO).
 * Asset fields are intentionally absent — they are system-controlled.
 */
export const transformParametersInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Name must be at least 1 character.")
      .max(120, "Name must be 120 characters or fewer.")
      .optional(),
    startSeconds: z
      .number({ error: "Start seconds must be a number." })
      .min(0, "Start seconds must be 0 or greater."),
    endSeconds: z
      .number({ error: "End seconds must be a number." })
      .min(0.1, "End seconds must be at least 0.1."),
    fpsResolution: z.enum(MAGIC_HOUR_FPS_RESOLUTIONS).default("HALF"),
    style: z.object({
      artStyle: z.enum(MAGIC_HOUR_ART_STYLES, {
        error: "Select a valid art style.",
      }),
      // Provider docs default to "default", but that currently resolves to
      // unavailable V3 models for many styles (e.g. Studio Ghibli).
      version: z.enum(MAGIC_HOUR_VERSIONS).default("v2"),
      promptType: z.enum(MAGIC_HOUR_PROMPT_TYPES).default("default"),
      prompt: z
        .string()
        .trim()
        .min(1, "Prompt cannot be empty.")
        .max(2000, "Prompt must be 2000 characters or fewer.")
        .nullable()
        .optional(),
      model: z.enum(MAGIC_HOUR_MODELS).default("default"),
    }),
  })
  .superRefine((value, ctx) => {
    if (value.endSeconds <= value.startSeconds) {
      ctx.addIssue({
        code: "custom",
        path: ["endSeconds"],
        message: "End seconds must be greater than start seconds.",
      });
    }

    const needsPrompt =
      value.style.promptType === "custom" ||
      value.style.promptType === "append_default";

    if (needsPrompt && (!value.style.prompt || value.style.prompt.length === 0)) {
      ctx.addIssue({
        code: "custom",
        path: ["style", "prompt"],
        message:
          "A prompt is required when prompt type is custom or append_default.",
      });
    }
  });

export type TransformParametersInput = z.infer<
  typeof transformParametersInputSchema
>;

export const transformRequestSchema = z.object({
  transformationId: z.string().min(1),
  parameters: transformParametersInputSchema,
});

export type TransformRequest = z.infer<typeof transformRequestSchema>;

export const transformResponseSchema = z.object({
  transformation: z.object({
    id: z.string().min(1),
    status: z.literal("queued"),
    parameters: transformParametersInputSchema,
    magicHour: z.object({
      projectId: z.string().min(1),
      creditsCharged: z.number().int().nonnegative().optional(),
    }),
    queuedAt: z.string().datetime(),
  }),
});

export type TransformResponse = z.infer<typeof transformResponseSchema>;
