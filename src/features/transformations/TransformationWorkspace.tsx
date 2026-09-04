"use client";

import { useState } from "react";

import { TransformForm } from "@/features/transformations/TransformForm";
import { VideoUploader } from "@/features/transformations/VideoUploader";
import type { UploadResponse } from "@/schemas/upload";

export function TransformationWorkspace() {
  const [upload, setUpload] = useState<UploadResponse | null>(null);

  return (
    <div className="flex w-full flex-col gap-12">
      <VideoUploader
        onUploaded={(data) => {
          setUpload(data);
        }}
      />

      {upload ? (
        <TransformForm
          transformationId={upload.transformation.id}
          sourceDurationSeconds={
            upload.transformation.sourceCloudinary.duration
          }
          sourcePreviewUrl={upload.transformation.sourceCloudinary.secureUrl}
        />
      ) : (
        <p className="text-sm text-zinc-500">
          Upload a source video to unlock the transformation form.
        </p>
      )}
    </div>
  );
}
