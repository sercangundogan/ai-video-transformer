import "server-only";

import { v2 as cloudinary } from "cloudinary";

import { getCloudinaryEnv } from "@/lib/env.server";

let configured = false;

export function getCloudinary() {
  if (!configured) {
    const env = getCloudinaryEnv();
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
    configured = true;
  }

  return cloudinary;
}

export const CLOUDINARY_SOURCE_FOLDER = "ai-video-transformer/source";
export const CLOUDINARY_GENERATED_FOLDER = "ai-video-transformer/generated";
