import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const serviceClient = await createServiceClient();

  // Look up by public_token first, then by id
  let verification = null;

  const { data: byToken } = await serviceClient
    .from("verifications")
    .select("*")
    .eq("public_token", id)
    .eq("is_public", true)
    .single();

  if (byToken) {
    verification = byToken;
  } else {
    const { data: byId } = await serviceClient
      .from("verifications")
      .select("*")
      .eq("id", id)
      .eq("is_public", true)
      .single();
    verification = byId;
  }

  if (!verification) {
    return NextResponse.json(
      { error: "Verification not found or not public" },
      { status: 404 }
    );
  }

  // Return limited public data (no user info, no storage paths)
  return NextResponse.json({
    status: verification.status,
    file_name: verification.file_name,
    file_hash: verification.file_hash_sha256,
    device_model: verification.device_model,
    device_serial: verification.device_serial,
    cert_chain_valid: verification.cert_chain_valid,
    total_gops: verification.total_gops,
    verified_gops: verification.verified_gops,
    tampered_gops: verification.tampered_gops,
    total_frames: verification.total_frames,
    verified_frames: verification.verified_frames,
    recording_start: verification.recording_start,
    recording_end: verification.recording_end,
    recording_duration_seconds: verification.recording_duration_seconds,
    gaps_detected: verification.gaps_detected,
    attestation_valid: verification.attestation_valid,
    verified_at: verification.completed_at,
  });
}
