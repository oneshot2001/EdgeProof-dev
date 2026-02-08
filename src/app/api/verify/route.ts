import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const verifySchema = z.object({
  verificationId: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  fileHash: z.string().min(1),
});

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

    // Update verification to 'processing' and set file hash
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

    // Dispatch to worker if configured
    const workerUrl = process.env.VERIFICATION_WORKER_URL;
    const workerApiKey = process.env.VERIFICATION_WORKER_API_KEY;

    if (workerUrl && workerApiKey) {
      // Download file from Supabase Storage and send to worker
      const { data: fileData, error: downloadError } = await serviceClient.storage
        .from("videos")
        .download(filePath);

      if (!downloadError && fileData) {
        const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/worker`;
        const formData = new FormData();
        formData.append("file", fileData, fileName);
        formData.append("callback_url", callbackUrl);
        formData.append("verification_id", verificationId);

        // Fire-and-forget: send to worker
        fetch(`${workerUrl}/verify`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${workerApiKey}`,
          },
          body: formData,
        }).catch((err) => {
          console.error("Failed to dispatch to worker:", err);
        });
      } else {
        console.error("Failed to download file for worker:", downloadError);
      }
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
