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
    <div className="flex w-full flex-col gap-12">
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
          onQueued={() => {
            invalidateHistory();
          }}
        />
      ) : (
        <p className="text-sm text-zinc-500">
          Upload a source video to unlock the transformation form.
        </p>
      )}

      <TransformationHistory />
    </div>
  );
}
