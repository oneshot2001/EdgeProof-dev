import { type WorkerVerificationResult } from "@/types/verification";

const WORKER_URL = process.env.VERIFICATION_WORKER_URL || "http://localhost:8000";
const WORKER_API_KEY = process.env.VERIFICATION_WORKER_API_KEY || "";

export interface VerifyFileOptions {
  file: Uint8Array;
  fileName: string;
  callbackUrl?: string;
}

export async function verifyFile(
  options: VerifyFileOptions
): Promise<WorkerVerificationResult> {
  const formData = new FormData();
  const blob = new Blob([options.file as BlobPart]);
  formData.append("file", blob, options.fileName);

  if (options.callbackUrl) {
    formData.append("callback_url", options.callbackUrl);
  }

  const response = await fetch(`${WORKER_URL}/verify`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${WORKER_API_KEY}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Worker verification failed (${response.status}): ${error}`);
  }

  return response.json() as Promise<WorkerVerificationResult>;
}

export async function checkWorkerHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${WORKER_URL}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
