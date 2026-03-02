import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import {
  readApiKeyFromAuthHeader,
  validateApiKey,
} from "@/lib/auth/api-keys";

const apiVerifySchema = z.object({
  file_url: z.string().url().optional(),
  callback_url: z.string().url().optional(),
});

async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function markVerificationError(
  verificationId: string,
  errorMessage: string,
): Promise<void> {
  const serviceClient = await createServiceClient();
  await serviceClient
    .from("verifications")
    .update({
      status: "error",
      completed_at: new Date().toISOString(),
      worker_response: { error: errorMessage },
    })
    .eq("id", verificationId);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!readApiKeyFromAuthHeader(authHeader)) {
    return NextResponse.json(
      { error: "Invalid API key. Use a valid ep_live_ prefixed key." },
      { status: 401 },
    );
  }

  const apiKeyRow = await validateApiKey(authHeader, { updateLastUsed: true });
  if (!apiKeyRow) {
    return NextResponse.json(
      { error: "Invalid or expired API key." },
      { status: 401 },
    );
  }

  const workerUrl = process.env.VERIFICATION_WORKER_URL;
  const workerApiKey = process.env.VERIFICATION_WORKER_API_KEY;
  if (!workerUrl || !workerApiKey) {
    return NextResponse.json(
      { error: "Verification worker is not configured." },
      { status: 503 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    const serviceClient = await createServiceClient();
    const verificationId = crypto.randomUUID();

    if (!contentType.includes("multipart/form-data")) {
      const body = await request.json();
      const parsed = apiVerifySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 },
        );
      }

      return NextResponse.json(
        {
          error:
            "URL-based verification is not currently supported. Upload a file as multipart/form-data using the `file` field.",
        },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileHash = await hashFile(file);
    const filePath = `uploads/${apiKeyRow.user_id}/${verificationId}/${file.name}`;

    const { error: insertError } = await serviceClient.from("verifications").insert({
      id: verificationId,
      user_id: apiKeyRow.user_id,
      team_id: apiKeyRow.team_id,
      status: "processing",
      file_name: file.name,
      file_size_bytes: file.size,
      file_hash_sha256: fileHash,
      file_storage_path: filePath,
      started_at: new Date().toISOString(),
    });

    if (insertError) {
      return NextResponse.json(
        { error: "Failed to create verification record." },
        { status: 500 },
      );
    }

    const { error: uploadError } = await serviceClient.storage
      .from("videos")
      .upload(filePath, file);

    if (uploadError) {
      await markVerificationError(verificationId, "Failed to upload file to storage.");
      return NextResponse.json(
        { error: "Failed to upload file for verification." },
        { status: 500 },
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const callbackUrl = `${appUrl}/api/webhooks/worker`;
    const workerFormData = new FormData();
    workerFormData.append("file", file, file.name);
    workerFormData.append("callback_url", callbackUrl);
    workerFormData.append("verification_id", verificationId);

    const workerResponse = await fetch(`${workerUrl}/verify`, {
      method: "POST",
      headers: { Authorization: `Bearer ${workerApiKey}` },
      body: workerFormData,
      signal: AbortSignal.timeout(30_000),
    });

    if (!workerResponse.ok) {
      const errorText = await workerResponse.text();
      await markVerificationError(
        verificationId,
        `Worker dispatch failed (${workerResponse.status}): ${errorText || "Unknown worker error"}`,
      );
      return NextResponse.json(
        { error: "Verification worker failed to accept the job." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      verification_id: verificationId,
      status: "processing",
      poll_url: `/api/v1/verifications/${verificationId}`,
    });
  } catch (err) {
    console.error("V1 verify error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
