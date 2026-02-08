import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  contentType: z.string().refine(
    (ct) => ["video/mp4", "video/x-matroska"].includes(ct),
    "Only MP4 and MKV files are supported"
  ),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fileName, fileSizeBytes, contentType } = parsed.data;

    // Fetch user profile to check quota and tier limits
    const serviceClient = await createServiceClient();
    const { data: userProfile } = await serviceClient
      .from("users")
      .select("subscription_tier, monthly_verifications")
      .eq("id", user.id)
      .single();

    const tier = (userProfile?.subscription_tier || "free") as SubscriptionTier;
    const limits = TIER_LIMITS[tier];

    // Check file size limit
    if (fileSizeBytes > limits.maxFileSizeBytes) {
      return NextResponse.json(
        { error: `File too large. Your ${limits.label} plan supports files up to ${limits.maxFileSizeLabel}.` },
        { status: 413 }
      );
    }

    // Check monthly verification quota
    const monthlyUsed = userProfile?.monthly_verifications ?? 0;
    if (limits.verificationsPerMonth !== Infinity && monthlyUsed >= limits.verificationsPerMonth) {
      return NextResponse.json(
        { error: `Monthly verification limit reached (${limits.verificationsPerMonth}). Upgrade your plan for more verifications.` },
        { status: 429 }
      );
    }

    // Create verification row with status 'pending'
    const verificationId = crypto.randomUUID();
    const filePath = `uploads/${user.id}/${verificationId}/${fileName}`;

    const { error: insertError } = await serviceClient
      .from("verifications")
      .insert({
        id: verificationId,
        user_id: user.id,
        team_id: null,
        status: "pending",
        file_name: fileName,
        file_size_bytes: fileSizeBytes,
        file_hash_sha256: "",
        file_storage_path: filePath,
        device_serial: null,
        device_model: null,
        device_firmware: null,
        device_hardware_id: null,
        cert_chain_valid: null,
        cert_intermediate: null,
        cert_root: null,
        total_gops: null,
        verified_gops: null,
        tampered_gops: null,
        total_frames: null,
        verified_frames: null,
        tampered_frames: null,
        recording_start: null,
        recording_end: null,
        recording_duration_seconds: null,
        attestation_valid: null,
        attestation_details: null,
        worker_response: null,
        certificate_url: null,
        certificate_hash: null,
        public_token: null,
        started_at: null,
        completed_at: null,
      });

    if (insertError) {
      console.error("Failed to create verification row:", insertError);
      return NextResponse.json({ error: "Failed to create verification" }, { status: 500 });
    }

    // Generate presigned upload URL
    const { data: signedUrl, error: signError } = await serviceClient.storage
      .from("videos")
      .createSignedUploadUrl(filePath);

    if (signError || !signedUrl) {
      console.error("Failed to create signed upload URL:", signError);
      return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
    }

    return NextResponse.json({
      uploadUrl: signedUrl.signedUrl,
      filePath,
      verificationId,
      token: signedUrl.token,
    });
  } catch (err) {
    console.error("Upload route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
