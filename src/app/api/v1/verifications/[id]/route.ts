import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate API key
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ep_live_")) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const keyHash = await hashApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, 16);

  const serviceClient = await createServiceClient();

  const { data: apiKeyRow } = await serviceClient
    .from("api_keys")
    .select("user_id")
    .eq("key_hash", keyHash)
    .eq("key_prefix", keyPrefix)
    .eq("revoked", false)
    .single();

  if (!apiKeyRow) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  // Fetch verification (scoped to the API key's user)
  const { data: verification, error } = await serviceClient
    .from("verifications")
    .select("*")
    .eq("id", id)
    .eq("user_id", apiKeyRow.user_id)
    .single();

  if (error || !verification) {
    return NextResponse.json({ error: "Verification not found" }, { status: 404 });
  }

  return NextResponse.json({
    verification_id: verification.id,
    status: verification.status,
    device: verification.device_serial
      ? {
          serial_number: verification.device_serial,
          model: verification.device_model,
          firmware_version: verification.device_firmware,
          hardware_id: verification.device_hardware_id,
        }
      : null,
    certificate_chain: verification.cert_chain_valid !== null
      ? {
          valid: verification.cert_chain_valid,
          intermediate_ca: verification.cert_intermediate,
          root_ca: verification.cert_root,
        }
      : null,
    integrity: verification.total_gops !== null
      ? {
          total_gops: verification.total_gops,
          verified_gops: verification.verified_gops,
          tampered_gops: verification.tampered_gops,
          total_frames: verification.total_frames,
          verified_frames: verification.verified_frames,
          tampered_frames: verification.tampered_frames,
        }
      : null,
    temporal: verification.recording_start
      ? {
          recording_start: verification.recording_start,
          recording_end: verification.recording_end,
          duration_seconds: verification.recording_duration_seconds,
          gaps_detected: verification.gaps_detected,
        }
      : null,
    attestation: verification.attestation_valid !== null
      ? {
          valid: verification.attestation_valid,
          details: verification.attestation_details,
        }
      : null,
    completed_at: verification.completed_at,
    created_at: verification.created_at,
  });
}
