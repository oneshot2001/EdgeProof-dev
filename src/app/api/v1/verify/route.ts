import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const apiVerifySchema = z.object({
  file_url: z.string().url().optional(),
  callback_url: z.string().url().optional(),
});

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function validateApiKey(authHeader: string) {
  if (!authHeader?.startsWith("Bearer ep_live_")) {
    return null;
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const keyHash = await hashApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, 16);

  const serviceClient = await createServiceClient();
  const { data: apiKeyRow } = await serviceClient
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .eq("key_prefix", keyPrefix)
    .eq("revoked", false)
    .single();

  if (!apiKeyRow) {
    return null;
  }

  // Check expiry
  if (apiKeyRow.expires_at && new Date(apiKeyRow.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at
  await serviceClient
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKeyRow.id);

  return apiKeyRow;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ep_live_")) {
    return NextResponse.json(
      { error: "Invalid API key. Use a valid ep_live_ prefixed key." },
      { status: 401 }
    );
  }

  const apiKeyRow = await validateApiKey(authHeader);
  if (!apiKeyRow) {
    return NextResponse.json(
      { error: "Invalid or expired API key." },
      { status: 401 }
    );
  }

  try {
    const contentType = request.headers.get("content-type") || "";
    const serviceClient = await createServiceClient();
    const verificationId = crypto.randomUUID();

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      const fileBlob = file as File;
      const filePath = `uploads/${apiKeyRow.user_id}/${verificationId}/${fileBlob.name}`;

      // Create verification row
      await serviceClient.from("verifications").insert({
        id: verificationId,
        user_id: apiKeyRow.user_id,
        team_id: apiKeyRow.team_id,
        status: "processing",
        file_name: fileBlob.name,
        file_size_bytes: fileBlob.size,
        file_hash_sha256: "",
        file_storage_path: filePath,
        started_at: new Date().toISOString(),
      });

      // Upload file to storage
      await serviceClient.storage
        .from("videos")
        .upload(filePath, fileBlob);

      // Dispatch to worker if configured
      const workerUrl = process.env.VERIFICATION_WORKER_URL;
      const workerApiKey = process.env.VERIFICATION_WORKER_API_KEY;

      if (workerUrl && workerApiKey) {
        const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/worker`;
        const workerFormData = new FormData();
        workerFormData.append("file", fileBlob, fileBlob.name);
        workerFormData.append("callback_url", callbackUrl);
        workerFormData.append("verification_id", verificationId);

        fetch(`${workerUrl}/verify`, {
          method: "POST",
          headers: { Authorization: `Bearer ${workerApiKey}` },
          body: workerFormData,
        }).catch((err) => console.error("Worker dispatch failed:", err));
      }

      return NextResponse.json({
        verification_id: verificationId,
        status: "processing",
        poll_url: `/api/v1/verifications/${verificationId}`,
      });
    } else {
      const body = await request.json();
      const parsed = apiVerifySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      // Create verification row for URL-based verification
      await serviceClient.from("verifications").insert({
        id: verificationId,
        user_id: apiKeyRow.user_id,
        team_id: apiKeyRow.team_id,
        status: "processing",
        file_name: parsed.data.file_url || "api-upload",
        file_size_bytes: 0,
        file_hash_sha256: "",
        file_storage_path: null,
        started_at: new Date().toISOString(),
      });

      return NextResponse.json({
        verification_id: verificationId,
        status: "processing",
        poll_url: `/api/v1/verifications/${verificationId}`,
      });
    }
  } catch (err) {
    console.error("V1 verify error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
