import "server-only";

import type { TransformParametersInput } from "@/schemas/transform";

/**
 * Maps internal camelCase parameters + trusted Cloudinary URL
 * to the Magic Hour Video-to-Video snake_case request body.
 */
export function toMagicHourVideoToVideoBody(options: {
  parameters: TransformParametersInput;
  cloudinarySecureUrl: string;
}): Record<string, unknown> {
  const { parameters, cloudinarySecureUrl } = options;
  const promptType = parameters.style.promptType ?? "default";

  const style: Record<string, unknown> = {
    art_style: parameters.style.artStyle,
    version: parameters.style.version ?? "default",
    prompt_type: promptType,
    model: parameters.style.model ?? "default",
  };

  if (promptType === "default") {
    style.prompt = null;
  } else {
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
