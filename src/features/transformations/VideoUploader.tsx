"use client";

import { useState } from "react";
import { FileUploaderRegular } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";

import {
  SectionCard,
  StatusBadge,
} from "@/components/ui/primitives";
import { getPublicEnv } from "@/lib/env.public";
import {
  MAX_VIDEO_BYTES,
  UPLOADCARE_ACCEPT,
} from "@/lib/upload/limits";
import { truncateFilename } from "@/features/transformations/status";
import type { ApiErrorBody } from "@/types/api";
import type { UploadResponse } from "@/schemas/upload";

type UploadState =
  | { status: "idle" }
  | { status: "uploading" }
  | { status: "registering" }
  | { status: "success"; data: UploadResponse }
  | { status: "error"; message: string };

type VideoUploaderProps = {
  onUploaded?: (data: UploadResponse) => void;
};

function readPublicKey(): string | null {
  try {
    return getPublicEnv().NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY;
  } catch {
    return null;
  }
}

async function registerUpload(uuid: string): Promise<UploadResponse> {
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uuid }),
  });

  const body: unknown = await response.json();

  if (!response.ok) {
    const errorBody = body as ApiErrorBody;
    throw new Error(
      errorBody.error?.message ?? "Failed to register the uploaded video.",
    );
  }

  return body as UploadResponse;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadBusyNotice({
  title,
  detail,
}: {
  title: string;
  detail: string;
}) {
  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-accent/25 bg-accent-soft px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <span
        className="mt-0.5 size-4 shrink-0 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
        aria-hidden
      />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-muted">{detail}</p>
      </div>
    </div>
  );
}

export function VideoUploader({ onUploaded }: VideoUploaderProps) {
  const publicKey = readPublicKey();
  const [state, setState] = useState<UploadState>({ status: "idle" });

  if (!publicKey) {
    return (
      <SectionCard
        id="upload"
        step="01"
        title="Upload source video"
        description="Uploadcare is not configured for this environment."
      >
        <p
          className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger"
          role="alert"
        >
          Missing `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY`. Add it to `.env.local` to
          enable uploads.
        </p>
      </SectionCard>
    );
  }

  const maxMb = MAX_VIDEO_BYTES / (1024 * 1024);
  const isBusy = state.status === "uploading" || state.status === "registering";

  return (
    <SectionCard
      id="upload"
      step="01"
      title="Upload source video"
      description={`MP4 or MOV, up to ${maxMb} MB. Files go directly to Uploadcare; we then store a durable Cloudinary copy.`}
      action={
        state.status === "success" ? (
          <StatusBadge status="uploaded" />
        ) : isBusy ? (
          <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent-soft px-2.5 py-1 text-[11px] font-semibold tracking-[0.04em] text-accent uppercase">
            <span
              className="size-1.5 animate-pulse rounded-full bg-current"
              aria-hidden
            />
            {state.status === "uploading" ? "Uploading" : "Saving"}
          </span>
        ) : null
      }
    >
      <div className="flex flex-col gap-4">
        <div
          className={`rounded-xl border border-dashed border-border-strong bg-surface-muted/70 p-3 transition-colors sm:p-5 ${
            isBusy
              ? "pointer-events-none opacity-55"
              : "hover:border-accent/35 hover:bg-surface-muted"
          }`}
          aria-busy={isBusy}
        >
          <FileUploaderRegular
            pubkey={publicKey}
            multiple={false}
            accept={UPLOADCARE_ACCEPT}
            maxLocalFileSizeBytes={MAX_VIDEO_BYTES}
            sourceList="local"
            classNameUploader="uc-dark"
            onFileUploadStart={() => {
              setState({ status: "uploading" });
            }}
            onFileUploadFailed={() => {
              setState({
                status: "error",
                message:
                  "Uploadcare rejected the file. Use MP4 or MOV within the size limit.",
              });
            }}
            onFileUploadSuccess={(file) => {
              void (async () => {
                if (!file.uuid) {
                  setState({
                    status: "error",
                    message: "Uploadcare did not return a file UUID.",
                  });
                  return;
                }

                setState({ status: "registering" });

                try {
                  const data = await registerUpload(file.uuid);
                  setState({ status: "success", data });
                  onUploaded?.(data);
                } catch (error) {
                  setState({
                    status: "error",
                    message:
                      error instanceof Error
                        ? error.message
                        : "Failed to register the uploaded video.",
                  });
                }
              })();
            }}
          />
        </div>

        {state.status === "idle" ? (
          <p className="text-sm text-muted">
            Choose a short clip to start. Transformation settings unlock after
            upload.
          </p>
        ) : null}

        {state.status === "uploading" ? (
          <UploadBusyNotice
            title="Uploading video…"
            detail="Sending the file to Uploadcare. Keep this tab open."
          />
        ) : null}

        {state.status === "registering" ? (
          <UploadBusyNotice
            title="Saving source video…"
            detail="Storing a Cloudinary copy and creating your transformation record. This can take a few seconds."
          />
        ) : null}

        {state.status === "error" ? (
          <p
            className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {state.message}
          </p>
        ) : null}

        {state.status === "success" ? (
          <div className="rounded-xl border border-success/20 bg-success-soft px-4 py-3">
            <p className="text-sm font-semibold text-success">
              Source ready for transformation
            </p>
            <dl className="mt-3 grid gap-2 text-sm text-foreground sm:grid-cols-2">
              <div className="min-w-0">
                <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                  File
                </dt>
                <dd
                  className="truncate"
                  title={state.data.transformation.sourceUploadcare.filename}
                >
                  {truncateFilename(
                    state.data.transformation.sourceUploadcare.filename,
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                  Size
                </dt>
                <dd>
                  {formatBytes(
                    state.data.transformation.sourceUploadcare.sizeBytes,
                  )}
                </dd>
              </div>
              {state.data.transformation.sourceCloudinary.duration ? (
                <div>
                  <dt className="text-[11px] font-medium tracking-wide text-muted uppercase">
                    Duration
                  </dt>
                  <dd>
                    {state.data.transformation.sourceCloudinary.duration.toFixed(
                      2,
                    )}
                    s
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}
