/**
 * Current Magic Hour Video-to-Video enums from official OpenAPI.
 * Keep in sync with docs/MAGIC_HOUR_V2V_PARAMETERS.md.
 */

export const MAGIC_HOUR_ART_STYLES = [
  "Minecraft",
  "Watercolor",
  "Pixel",
  "Retro Sci-Fi",
  "Lego",
  "Origami",
  "Ghost",
  "Sub-Zero",
  "Studio Ghibli",
  "Comic",
  "Impressionism",
  "Master Chief",
  "Solid Snake",
  "Street Fighter",
  "Hologram",
  "GTA",
  "Clay",
  "Mystique",
  "Dragonball Z",
  "Mario",
  "Samurai",
  "Spartan",
  "Boba Fett",
  "3D Render",
  "Airbender",
  "Android",
  "Anime Warrior",
  "Armored Knight",
  "Assassin's Creed",
  "Avatar",
  "Black Spiderman",
  "Bold Anime",
  "Celestial Skin",
  "Chinese Swordsmen",
  "Cyberpunk",
  "Cypher",
  "Dark Fantasy",
  "Future Bot",
  "Futuristic Fantasy",
  "Ghibli Anime",
  "Gundam",
  "Illustration",
  "Ink",
  "Ink Poster",
  "Jinx",
  "Knight",
  "Link",
  "Marble",
  "Mech",
  "Naruto",
  "Neon Dream",
  "No Art Style",
  "Oil Painting",
  "On Fire",
  "Painterly Anime",
  "Pixar",
  "Power Armor",
  "Power Ranger",
  "Radiant Anime",
  "Realistic Anime",
  "Realistic Pixar",
  "Retro Anime",
  "Samurai Bot",
  "Sharp Anime",
  "Soft Anime",
  "Starfield",
  "The Void",
  "Tomb Raider",
  "Underwater",
  "Van Gogh",
  "Viking",
  "Western Anime",
  "Wu Kong",
  "Wuxia Anime",
  "Zelda",
] as const;

export type MagicHourArtStyle = (typeof MAGIC_HOUR_ART_STYLES)[number];

export const MAGIC_HOUR_MODELS = [
  "Dreamshaper",
  "Absolute Reality",
  "Flat 2D Anime",
  "Soft Anime",
  "Kaywaii",
  "Western Anime",
  "3D Anime",
  "default",
] as const;

export type MagicHourModel = (typeof MAGIC_HOUR_MODELS)[number];

export const MAGIC_HOUR_VERSIONS = ["v1", "v2", "default"] as const;
export type MagicHourVersion = (typeof MAGIC_HOUR_VERSIONS)[number];

export const MAGIC_HOUR_PROMPT_TYPES = [
  "default",
  "custom",
  "append_default",
] as const;
export type MagicHourPromptType = (typeof MAGIC_HOUR_PROMPT_TYPES)[number];

export const MAGIC_HOUR_FPS_RESOLUTIONS = ["FULL", "HALF"] as const;
export type MagicHourFpsResolution =
  (typeof MAGIC_HOUR_FPS_RESOLUTIONS)[number];
