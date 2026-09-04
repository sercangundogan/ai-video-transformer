/**
 * Cloudinary provider boundary.
 */

export {
  getCloudinary,
  CLOUDINARY_GENERATED_FOLDER,
  CLOUDINARY_SOURCE_FOLDER,
} from "@/lib/cloudinary/client";
export {
  destroySourceVideo,
  uploadSourceVideoFromUrl,
} from "@/lib/cloudinary/upload-source";
export {
  generatedPublicId,
  uploadGeneratedVideoFromUrl,
} from "@/lib/cloudinary/upload-generated";
export {
  extractCloudinaryErrorDetails,
  logCloudinaryFailure,
} from "@/lib/cloudinary/errors";
