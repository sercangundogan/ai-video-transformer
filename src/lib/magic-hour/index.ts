/**
 * Magic Hour provider boundary.
 */

export {
  MAGIC_HOUR_ART_STYLES,
  MAGIC_HOUR_FPS_RESOLUTIONS,
  MAGIC_HOUR_MODELS,
  MAGIC_HOUR_PROMPT_TYPES,
  MAGIC_HOUR_VERSIONS,
  type MagicHourArtStyle,
  type MagicHourFpsResolution,
  type MagicHourModel,
  type MagicHourPromptType,
  type MagicHourVersion,
} from "@/lib/magic-hour/enums";
export { createVideoToVideoJob } from "@/lib/magic-hour/client";
export { mapMagicHourHttpError } from "@/lib/magic-hour/errors";
export {
  summarizeMagicHourRequestBody,
  toMagicHourVideoToVideoBody,
} from "@/lib/magic-hour/map-request";
