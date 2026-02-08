"use client";

import { useState } from "react";
import { DropZone } from "@/components/upload/DropZone";
import { FilePreview } from "@/components/upload/FilePreview";
import { UploadProgress } from "@/components/upload/UploadProgress";
import { VerificationResult } from "@/components/verification/VerificationResult";
import { useVerification } from "@/hooks/useVerification";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function VerifyPage() {
  const [file, setFile] = useState<File | null>(null);
  const { tier } = useSubscription();
  const { phase, stage, progress, result, error, startVerification, reset } =
    useVerification();

  const handleFileAccepted = (acceptedFile: File) => {
    setFile(acceptedFile);
  };

  const handleVerify = () => {
    if (file) {
      startVerification(file);
    }
  };

  const handleReset = () => {
    setFile(null);
    reset();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verify Video</h1>
        <p className="text-muted-foreground">
          Upload a signed video file to verify its cryptographic authenticity
        </p>
      </div>

      {phase === "idle" && !file && (
        <DropZone onFileAccepted={handleFileAccepted} tier={tier} />
      )}

      {phase === "idle" && file && (
        <div className="space-y-4">
          <FilePreview file={file} onRemove={handleReset} />
          <div className="flex gap-3">
            <Button onClick={handleVerify} size="lg">
              Verify Authenticity
            </Button>
            <Button variant="outline" onClick={handleReset}>
              Choose Different File
            </Button>
          </div>
        </div>
      )}

      {(phase === "uploading" || phase === "processing") && file && (
        <UploadProgress
          stage={stage}
          progress={progress}
          fileName={file.name}
        />
      )}

      {phase === "error" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">
                Verification Failed
              </p>
              <p className="text-sm text-destructive/80">
                {error || "An unexpected error occurred"}
              </p>
            </div>
          </div>
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      )}

      {phase === "complete" && result && (
        <div className="space-y-4">
          <VerificationResult verification={result} />
          <Button onClick={handleReset} variant="outline">
            <RotateCcw className="mr-2 h-4 w-4" />
            Verify Another File
          </Button>
        </div>
      )}
    </div>
  );
}
