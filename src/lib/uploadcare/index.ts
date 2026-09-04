/**
 * Uploadcare provider boundary.
 * Server file metadata helpers live in `./files`.
 * Client upload UI uses `@uploadcare/react-uploader`.
 */

export {
  buildUploadcareCdnUrl,
  fetchUploadcareFileInfo,
  resolveTrustedUploadcareCdnUrl,
  type UploadcareFileInfo,
} from "@/lib/uploadcare/files";
export {
  isTrustedUploadcareHost,
  uploadcareFileInfoSchema,
} from "@/lib/uploadcare/cdn-url";
