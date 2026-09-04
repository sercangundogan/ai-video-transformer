import "server-only";

import type { TransformParametersInput } from "@/schemas/transform";

/**
 * Maps internal camelCase parameters + trusted Cloudinary URL
 * to the Magic Hour Video-to-Video snake_case request body.
 *
 * Note: when prompt_type is `default`, `prompt` is omitted entirely.
 * Sending `prompt: null` is unnecessary and can confuse validation.
 */
export function toMagicHourVideoToVideoBody(options: {
  parameters: TransformParametersInput;
  cloudinarySecureUrl: string;
}): Record<string, unknown> {
  const { parameters, cloudinarySecureUrl } = options;
  const promptType = parameters.style.promptType ?? "default";
  const version = parameters.style.version ?? "v2";

  const style: Record<string, unknown> = {
    art_style: parameters.style.artStyle,
    version,
    prompt_type: promptType,
    model: parameters.style.model ?? "default",
  };

  if (promptType === "custom" || promptType === "append_default") {
    style.prompt = parameters.style.prompt ?? null;
  }

  const body: Record<string, unknown> = {
    start_seconds: parameters.startSeconds,
    end_seconds: parameters.endSeconds,
    fps_resolution: parameters.fpsResolution ?? "HALF",
    style,
    assets: {
      video_source: "file",
      video_file_path: cloudinarySecureUrl,
    },
  };

  if (parameters.name) {
    body.name = parameters.name;
  }

  return body;
}

/**
 * Safe summary for server logs (no secrets; video URL reduced to host + extension).
 */
export function summarizeMagicHourRequestBody(
  body: Record<string, unknown>,
): Record<string, unknown> {
  const assets =
    body.assets && typeof body.assets === "object"
      ? (body.assets as Record<string, unknown>)
      : undefined;

  let videoHost: string | undefined;
  let videoExtension: string | undefined;
  if (typeof assets?.video_file_path === "string") {
    try {
      const url = new URL(assets.video_file_path);
      videoHost = url.host;
      const parts = url.pathname.split(".");
      videoExtension = parts.length > 1 ? parts.at(-1) : undefined;
    } catch {
      videoHost = "invalid-url";
    }
  }

  return {
    name: body.name,
    start_seconds: body.start_seconds,
    end_seconds: body.end_seconds,
    fps_resolution: body.fps_resolution,
    style: body.style,
    assets: assets
      ? {
          video_source: assets.video_source,
          video_host: videoHost,
          video_extension: videoExtension,
        }
      : undefined,
  };
}
