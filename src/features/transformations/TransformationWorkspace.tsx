"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { TransformForm } from "@/features/transformations/TransformForm";
import { TransformationHistory } from "@/features/transformations/TransformationHistory";
import { transformationHistoryQueryKey } from "@/features/transformations/query-keys";
import { VideoUploader } from "@/features/transformations/VideoUploader";
import type { UploadResponse } from "@/schemas/upload";

export function TransformationWorkspace() {
  const queryClient = useQueryClient();
  const [upload, setUpload] = useState<UploadResponse | null>(null);

  function invalidateHistory() {
    void queryClient.invalidateQueries({
      queryKey: transformationHistoryQueryKey,
    });
  }

  return (
    <div className="flex w-full flex-col gap-6 sm:gap-8">
      <VideoUploader
        onUploaded={(data) => {
          setUpload(data);
          invalidateHistory();
        }}
      />

      {upload ? (
        <TransformForm
          transformationId={upload.transformation.id}
          sourceDurationSeconds={
            upload.transformation.sourceCloudinary.duration
          }
          sourcePreviewUrl={upload.transformation.sourceCloudinary.secureUrl}
          sourceFilename={upload.transformation.sourceUploadcare.filename}
          onQueued={() => {
            invalidateHistory();
          }}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-surface/80 px-4 py-8 text-center sm:px-6">
          <p className="text-sm font-medium text-foreground">
            Transformation form unlocks after upload
          </p>
          <p className="mt-1 text-sm text-muted">
            Once your source video is saved, you can set clip, style, and submit
            a Magic Hour job.
          </p>
        </div>
      )}

      <TransformationHistory />
    </div>
  );
}
