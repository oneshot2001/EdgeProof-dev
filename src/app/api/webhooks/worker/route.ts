import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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

    // TODO: In production, update the verification record in Supabase
    // with all the worker results. For now, just acknowledge.
    console.log(`Worker callback received for verification ${result.verification_id}: ${result.status}`);

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
