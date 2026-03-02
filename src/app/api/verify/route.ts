import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateMockResult } from "@/lib/verification/dev-mock";

const verifySchema = z.object({
  verificationId: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  fileHash: z.string().min(1),
});

async function hashBlob(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { verificationId, filePath, fileName, fileSizeBytes, fileHash } = parsed.data;

    const serviceClient = await createServiceClient();

    // Set processing state with provisional client hash.
    // When a worker is configured, this hash is verified against stored bytes before dispatch.
    const { error: updateError } = await serviceClient
      .from("verifications")
      .update({
        status: "processing",
        file_hash_sha256: fileHash,
        started_at: new Date().toISOString(),
      })
      .eq("id", verificationId)
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Failed to update verification:", updateError);
      return NextResponse.json({ error: "Failed to start verification" }, { status: 500 });
    }

    // Increment user's monthly verification count
    const { data: currentUser } = await serviceClient
      .from("users")
      .select("monthly_verifications")
      .eq("id", user.id)
      .single();

    if (currentUser) {
      await serviceClient
        .from("users")
        .update({
          monthly_verifications: currentUser.monthly_verifications + 1,
        })
        .eq("id", user.id);
    }

    // Insert 'uploaded' audit log entry
    await serviceClient.from("audit_log").insert({
      verification_id: verificationId,
      user_id: user.id,
      action: "uploaded",
      ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
      user_agent: request.headers.get("user-agent"),
      metadata: { file_name: fileName, file_size_bytes: fileSizeBytes },
    });

    // Dispatch to worker if configured, otherwise use dev mock fallback
    const workerUrl = process.env.VERIFICATION_WORKER_URL;
    const workerApiKey = process.env.VERIFICATION_WORKER_API_KEY;

    if (workerUrl && workerApiKey) {
      // Download file from Supabase Storage and send to worker
      const { data: fileData, error: downloadError } = await serviceClient.storage
        .from("videos")
        .download(filePath);

      if (downloadError || !fileData) {
        console.error("Failed to download file for worker:", downloadError);
        await markVerificationError(serviceClient, verificationId, user.id, "Failed to download video from storage");
        return NextResponse.json(
          { error: "Failed to fetch uploaded file for verification" },
          { status: 500 },
        );
      }

      // Compute server-side hash from stored bytes and reject mismatches.
      const serverHash = await hashBlob(fileData);
      if (serverHash !== fileHash) {
        await markVerificationError(
          serviceClient,
          verificationId,
          user.id,
          "Uploaded file hash mismatch (client hash does not match stored file).",
        );
        return NextResponse.json(
          { error: "File integrity check failed before verification." },
          { status: 400 },
        );
      }

      await serviceClient
        .from("verifications")
        .update({ file_hash_sha256: serverHash })
        .eq("id", verificationId)
        .eq("user_id", user.id);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const callbackUrl = `${appUrl}/api/webhooks/worker`;
      const formData = new FormData();
      formData.append("file", fileData, fileName);
      formData.append("callback_url", callbackUrl);
      formData.append("verification_id", verificationId);

      // Dispatch to worker with timeout and explicit non-2xx handling.
      try {
        const workerResponse = await fetch(`${workerUrl}/verify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${workerApiKey}`,
          },
          body: formData,
          signal: AbortSignal.timeout(30_000),
        });

        if (!workerResponse.ok) {
          const workerError = await workerResponse.text();
          await markVerificationError(
            serviceClient,
            verificationId,
            user.id,
            `Worker dispatch failed (${workerResponse.status}): ${workerError || "Unknown worker error"}`,
          );
          return NextResponse.json(
            { error: "Verification worker failed to accept the job." },
            { status: 502 },
          );
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        console.error("Failed to dispatch to worker:", err);
        await markVerificationError(
          serviceClient,
          verificationId,
          user.id,
          `Worker dispatch failed: ${message}`,
        );
        return NextResponse.json(
          { error: "Failed to dispatch verification to worker." },
          { status: 502 },
        );
      }
    } else {
      // Dev fallback: simulate worker callback with mock data
      console.log("[dev-mock] No VERIFICATION_WORKER_URL set — using mock results");
      const mockResult = generateMockResult(verificationId, fileName);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const callbackUrl = `${appUrl}/api/webhooks/worker`;

      // Simulate async worker delay then POST mock result to webhook
      setTimeout(async () => {
        try {
          await fetch(callbackUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: workerApiKey ? `Bearer ${workerApiKey}` : "",
            },
            body: JSON.stringify(mockResult),
          });
        } catch (err) {
          console.error("[dev-mock] Failed to deliver mock callback:", err);
        }
      }, 2000);
    }

    return NextResponse.json({
      verificationId,
      status: "processing",
    });
  } catch (err) {
    console.error("Verify route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Mark a verification as errored and log to audit_log
async function markVerificationError(
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>,
  verificationId: string,
  userId: string,
  errorMessage: string,
) {
  try {
    await serviceClient
      .from("verifications")
      .update({
        status: "error",
        completed_at: new Date().toISOString(),
      })
      .eq("id", verificationId)
      .eq("user_id", userId);

    await serviceClient.from("audit_log").insert({
      verification_id: verificationId,
      user_id: userId,
      action: "verified",
      metadata: { error: errorMessage, status: "error" },
    });
  } catch (logErr) {
    console.error("Failed to log verification error:", logErr);
  }
}
