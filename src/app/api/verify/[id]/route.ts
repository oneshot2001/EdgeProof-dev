import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: verification, error: queryError } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id)
    .single();

  if (queryError || !verification) {
    return NextResponse.json({ error: "Verification not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: verification.id,
    status: verification.status,
    file_name: verification.file_name,
    device_serial: verification.device_serial,
    device_model: verification.device_model,
    cert_chain_valid: verification.cert_chain_valid,
    total_gops: verification.total_gops,
    verified_gops: verification.verified_gops,
    tampered_gops: verification.tampered_gops,
    total_frames: verification.total_frames,
    verified_frames: verification.verified_frames,
    tampered_frames: verification.tampered_frames,
    recording_start: verification.recording_start,
    recording_end: verification.recording_end,
    recording_duration_seconds: verification.recording_duration_seconds,
    gaps_detected: verification.gaps_detected,
    attestation_valid: verification.attestation_valid,
    public_token: verification.public_token,
    certificate_url: verification.certificate_url,
    completed_at: verification.completed_at,
    created_at: verification.created_at,
  });
}
