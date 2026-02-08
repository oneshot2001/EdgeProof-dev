"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileVideo, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCEPTED_FILE_TYPES, TIER_LIMITS } from "@/lib/constants";
import type { SubscriptionTier } from "@/lib/constants";

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  tier?: SubscriptionTier;
  disabled?: boolean;
}

export function DropZone({
  onFileAccepted,
  tier = "free",
  disabled = false,
}: DropZoneProps) {
  const [error, setError] = useState<string | null>(null);
  const limits = TIER_LIMITS[tier];

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setError(null);

      if (rejectedFiles.length > 0) {
        setError("Only .mp4 and .mkv video files are supported.");
        return;
      }

      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      if (file.size > limits.maxFileSizeBytes) {
        setError(
          `File is too large. Maximum size for ${limits.label} tier is ${limits.maxFileSizeLabel}.`
        );
        return;
      }

      onFileAccepted(file);
    },
    [onFileAccepted, limits]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    maxFiles: 1,
    disabled,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-4 text-center">
          {isDragActive ? (
            <>
              <FileVideo className="h-16 w-16 text-primary" />
              <p className="text-lg font-medium">Drop your video file here</p>
            </>
          ) : (
            <>
              <Upload className="h-16 w-16 text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">
                  Drag and drop your video file here
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or click to browse
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Supports .mp4 and .mkv files up to {limits.maxFileSizeLabel}
              </p>
            </>
          )}
        </div>
      </div>
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
