"use client";

import { useState } from "react";
import { FileUploaderRegular } from "@uploadcare/react-uploader/next";
import "@uploadcare/react-uploader/core.css";

import { getPublicEnv } from "@/lib/env.public";
import {
  MAX_VIDEO_BYTES,
  UPLOADCARE_ACCEPT,
} from "@/lib/upload/limits";
import type { ApiErrorBody } from "@/types/api";
import type { UploadResponse } from "@/schemas/upload";

type UploadState =
  | { status: "idle" }
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

export function VideoUploader({ onUploaded }: VideoUploaderProps) {
  const publicKey = readPublicKey();
  const [state, setState] = useState<UploadState>({ status: "idle" });

  if (!publicKey) {
    return (
      <p className="text-sm text-red-700 dark:text-red-400">
        Missing `NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY`. Add it to `.env.local` to
        enable uploads.
      </p>
    );
  }

  return (
    <section className="flex w-full flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          Upload source video
        </h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          MP4 or MOV, up to {MAX_VIDEO_BYTES / (1024 * 1024)} MB. Files go
          directly to Uploadcare; our API then stores them in Cloudinary.
        </p>
      </div>

      <FileUploaderRegular
        pubkey={publicKey}
        multiple={false}
        accept={UPLOADCARE_ACCEPT}
        maxLocalFileSizeBytes={MAX_VIDEO_BYTES}
        sourceList="local"
        classNameUploader="uc-light"
        onFileUploadFailed={() => {
          setState({
            status: "error",
            message:
              "Uploadcare rejected the file. Check format (MP4/MOV) and size.",
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

      {state.status === "registering" ? (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Transferring to Cloudinary and saving metadata…
        </p>
      ) : null}

      {state.status === "error" ? (
        <p className="text-sm text-red-700 dark:text-red-400" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.status === "success" ? (
        <div className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <p className="font-medium text-zinc-900 dark:text-zinc-50">
            Upload registered
          </p>
          <p className="text-zinc-600 dark:text-zinc-400">
            Transformation ID:{" "}
            <code className="font-mono text-xs">
              {state.data.transformation.id}
            </code>
          </p>
          <p className="break-all text-zinc-600 dark:text-zinc-400">
            Cloudinary: {state.data.transformation.sourceCloudinary.secureUrl}
          </p>
        </div>
      ) : null}
    </section>
  );
}
