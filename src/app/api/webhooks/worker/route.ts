import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";

const workerCallbackSchema = z.object({
  verification_id: z.string(),
  status: z.enum(["authentic", "tampered", "unsigned", "inconclusive", "error"]),
  processing_time_ms: z.number(),
  device: z.object({
    serial_number: z.string(),
    model: z.string(),
    firmware_version: z.string(),
    hardware_id: z.string(),
    axis_os_version: z.string(),
  }),
  certificate_chain: z.object({
    valid: z.boolean(),
    device_cert_subject: z.string(),
    intermediate_ca: z.string(),
    root_ca: z.string(),
    root_ca_expiry: z.string(),
    signature_algorithm: z.string(),
  }),
  attestation: z.object({
    valid: z.boolean(),
    key_origin: z.string(),
    details: z.string(),
  }),
  integrity: z.object({
    total_gops: z.number(),
    verified_gops: z.number(),
    tampered_gops: z.number(),
    total_frames: z.number(),
    verified_frames: z.number(),
    tampered_frames: z.number(),
    gop_chain_intact: z.boolean(),
    hash_algorithm: z.string(),
  }),
  temporal: z.object({
    recording_start: z.string(),
    recording_end: z.string(),
    duration_seconds: z.number(),
    gaps_detected: z.number(),
    gap_details: z.array(z.object({
      from: z.string(),
      to: z.string(),
      gap_seconds: z.number(),
    })),
  }),
  video_metadata: z.object({
    codec: z.string(),
    container: z.string(),
    resolution: z.string(),
    framerate: z.number(),
    sei_uuid: z.string(),
  }),
  errors: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  // Verify worker API key
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.VERIFICATION_WORKER_API_KEY;

  if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = workerCallbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid callback payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = parsed.data;
    const publicToken = `pub_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

    const serviceClient = await createServiceClient();

    // Update verification row with all worker results
    const { error: updateError } = await serviceClient
      .from("verifications")
      .update({
        status: result.status,
        device_serial: result.device.serial_number || null,
        device_model: result.device.model || null,
        device_firmware: result.device.firmware_version || null,
        device_hardware_id: result.device.hardware_id || null,
        cert_chain_valid: result.certificate_chain.valid,
        cert_intermediate: result.certificate_chain.intermediate_ca || null,
        cert_root: result.certificate_chain.root_ca || null,
        total_gops: result.integrity.total_gops,
        verified_gops: result.integrity.verified_gops,
        tampered_gops: result.integrity.tampered_gops,
        total_frames: result.integrity.total_frames,
        verified_frames: result.integrity.verified_frames,
        tampered_frames: result.integrity.tampered_frames,
        recording_start: result.temporal.recording_start || null,
        recording_end: result.temporal.recording_end || null,
        recording_duration_seconds: result.temporal.duration_seconds,
        gaps_detected: result.temporal.gaps_detected,
        attestation_valid: result.attestation.valid,
        attestation_details: {
          key_origin: result.attestation.key_origin,
          details: result.attestation.details,
        },
        worker_response: result as unknown as Record<string, unknown>,
        public_token: publicToken,
        is_public: true,
        certificate_url: `/api/certificates/${result.verification_id}/pdf`,
        completed_at: new Date().toISOString(),
      })
      .eq("id", result.verification_id);

    if (updateError) {
      console.error("Failed to update verification with worker results:", updateError);
      return NextResponse.json({ error: "Failed to persist results" }, { status: 500 });
    }

    // Get verification to find user_id for audit log
    const { data: verification } = await serviceClient
      .from("verifications")
      .select("user_id")
      .eq("id", result.verification_id)
      .single();

    // Insert 'verified' audit log entry
    if (verification) {
      await serviceClient.from("audit_log").insert({
        verification_id: result.verification_id,
        user_id: verification.user_id,
        action: "verified",
        metadata: {
          processing_time_ms: result.processing_time_ms,
          status: result.status,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Worker webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
