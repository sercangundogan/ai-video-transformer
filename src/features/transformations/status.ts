import type { TransformationStatus } from "@/types/transformation";

export function statusLabel(status: TransformationStatus): string {
  switch (status) {
    case "uploaded":
      return "Uploaded";
    case "queued":
      return "Queued";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

export function statusTone(
  status: TransformationStatus,
): "neutral" | "info" | "accent" | "success" | "danger" {
  switch (status) {
    case "uploaded":
      return "neutral";
    case "queued":
      return "info";
    case "processing":
      return "accent";
    case "completed":
      return "success";
    case "failed":
      return "danger";
    default:
      return "neutral";
  }
}

export function formatTimestamp(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export function truncateFilename(filename: string, max = 42): string {
  if (filename.length <= max) {
    return filename;
  }

  const extensionIndex = filename.lastIndexOf(".");
  if (extensionIndex <= 0 || filename.length - extensionIndex > 8) {
    return `${filename.slice(0, max - 1)}…`;
  }

  const extension = filename.slice(extensionIndex);
  const keep = max - extension.length - 1;
  return `${filename.slice(0, Math.max(keep, 8))}…${extension}`;
}
