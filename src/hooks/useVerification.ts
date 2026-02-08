"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { POLLING_INTERVAL_MS, TERMINAL_STATUSES } from "@/lib/constants";
import { type VerificationPollResponse } from "@/types/api";
import { type UploadStage } from "@/components/upload/UploadProgress";

export type VerificationPhase = "idle" | "uploading" | "processing" | "complete" | "error";

interface UseVerificationReturn {
  phase: VerificationPhase;
  stage: UploadStage;
  progress: number;
  result: VerificationPollResponse | null;
  error: string | null;
  startVerification: (file: File) => void;
  reset: () => void;
}

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useVerification(): UseVerificationReturn {
  const [phase, setPhase] = useState<VerificationPhase>("idle");
  const [stage, setStage] = useState<UploadStage>("uploading");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<VerificationPollResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  const pollVerification = useCallback(
    (verificationId: string) => {
      setStage("verifying");
      setProgress(60);

      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/verify/${verificationId}`);
          if (!res.ok) throw new Error("Failed to fetch verification status");

          const data: VerificationPollResponse = await res.json();

          if (TERMINAL_STATUSES.includes(data.status as (typeof TERMINAL_STATUSES)[number])) {
            stopPolling();
            setResult(data);
            setStage("complete");
            setProgress(100);
            setPhase("complete");
          } else {
            // Increment progress while processing
            setProgress((prev) => Math.min(prev + 5, 90));
          }
        } catch (err) {
          stopPolling();
          setError(err instanceof Error ? err.message : "Polling failed");
          setPhase("error");
        }
      }, POLLING_INTERVAL_MS);
    },
    [stopPolling]
  );

  const startVerification = useCallback(
    async (file: File) => {
      setPhase("uploading");
      setStage("uploading");
      setProgress(10);
      setError(null);
      setResult(null);

      try {
        // Step 1: Get presigned URL
        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: file.name,
            fileSizeBytes: file.size,
            contentType: file.type || "video/mp4",
          }),
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json();
          throw new Error(err.error || "Upload failed");
        }

        const { uploadUrl, verificationId, filePath, token } = await uploadRes.json();
        setProgress(20);

        // Step 2: Upload file to presigned URL
        const uploadToStorageRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: {
            "Content-Type": file.type || "video/mp4",
            ...(token ? { "x-upsert": "true" } : {}),
          },
          body: file,
        });

        if (!uploadToStorageRes.ok) {
          throw new Error("Failed to upload file to storage");
        }

        setProgress(30);
        setStage("processing");

        // Step 3: Compute SHA-256 hash
        const fileHash = await computeFileHash(file);
        setProgress(40);

        // Step 4: Initiate verification
        const verifyRes = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            verificationId,
            filePath,
            fileName: file.name,
            fileSizeBytes: file.size,
            fileHash,
          }),
        });

        if (!verifyRes.ok) {
          const err = await verifyRes.json();
          throw new Error(err.error || "Verification failed");
        }

        setPhase("processing");
        setProgress(50);

        // Step 5: Start polling
        pollVerification(verificationId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setPhase("error");
      }
    },
    [pollVerification]
  );

  const reset = useCallback(() => {
    stopPolling();
    setPhase("idle");
    setStage("uploading");
    setProgress(0);
    setResult(null);
    setError(null);
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return { phase, stage, progress, result, error, startVerification, reset };
}
