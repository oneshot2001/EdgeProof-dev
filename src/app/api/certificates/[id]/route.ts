import { NextRequest, NextResponse } from "next/server";
import { MOCK_VERIFICATIONS } from "@/lib/mock/data";
import { type CertificateData } from "@/types/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Find verification (mock data fallback)
  const verification = MOCK_VERIFICATIONS.find((v) => v.id === id);

  if (!verification) {
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 404 }
    );
  }

  const certificateData: CertificateData = {
    verificationId: verification.id,
    status: verification.status,
    fileName: verification.file_name,
    fileHash: verification.file_hash_sha256,
    device: {
      serial: verification.device_serial,
      model: verification.device_model,
      firmware: verification.device_firmware,
    },
    certificateChain: {
      valid: verification.cert_chain_valid,
      intermediate: verification.cert_intermediate,
      root: verification.cert_root,
    },
    integrity: {
      totalGops: verification.total_gops,
      verifiedGops: verification.verified_gops,
      tamperedGops: verification.tampered_gops,
      totalFrames: verification.total_frames,
      verifiedFrames: verification.verified_frames,
      tamperedFrames: verification.tampered_frames,
    },
    temporal: {
      recordingStart: verification.recording_start,
      recordingEnd: verification.recording_end,
      durationSeconds: verification.recording_duration_seconds,
      gapsDetected: verification.gaps_detected,
    },
    attestation: {
      valid: verification.attestation_valid,
      details: verification.attestation_details,
    },
    publicToken: verification.public_token,
    verifiedAt: verification.completed_at,
    issuedAt: new Date().toISOString(),
  };

  return NextResponse.json(certificateData);
}
