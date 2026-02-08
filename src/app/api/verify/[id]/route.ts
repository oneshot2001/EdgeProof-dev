import { NextRequest, NextResponse } from "next/server";
import { MOCK_VERIFICATIONS } from "@/lib/mock/data";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let verificationStore: Map<string, { status: string; result?: any }> | null = null;

async function getStore() {
  if (!verificationStore) {
    try {
      const mod = await import("../route");
      verificationStore = mod.verificationStore;
    } catch {
      verificationStore = new Map();
    }
  }
  return verificationStore;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Check in-memory store first (active verifications)
  const store = await getStore();
  const active = store.get(id);

  if (active) {
    if (active.result) {
      const r = active.result as Record<string, unknown>;
      const device = r.device as Record<string, string> | undefined;
      const integrity = r.integrity as Record<string, number> | undefined;
      const temporal = r.temporal as Record<string, unknown> | undefined;
      const attestation = r.attestation as Record<string, unknown> | undefined;
      const certChain = r.certificate_chain as Record<string, unknown> | undefined;

      return NextResponse.json({
        id,
        status: active.status,
        file_name: "uploaded-file.mp4",
        device_serial: device?.serial_number || null,
        device_model: device?.model || null,
        cert_chain_valid: certChain?.valid ?? null,
        total_gops: integrity?.total_gops ?? null,
        verified_gops: integrity?.verified_gops ?? null,
        tampered_gops: integrity?.tampered_gops ?? null,
        total_frames: integrity?.total_frames ?? null,
        verified_frames: integrity?.verified_frames ?? null,
        tampered_frames: integrity?.tampered_frames ?? null,
        recording_start: (temporal?.recording_start as string) || null,
        recording_end: (temporal?.recording_end as string) || null,
        recording_duration_seconds: (temporal?.duration_seconds as number) || null,
        gaps_detected: (temporal?.gaps_detected as number) || 0,
        attestation_valid: attestation?.valid ?? null,
        public_token: `pub_${id.slice(0, 12)}`,
        certificate_url: `/api/certificates/${id}/pdf`,
        completed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      id,
      status: active.status,
      file_name: "uploaded-file.mp4",
      device_serial: null,
      device_model: null,
      cert_chain_valid: null,
      total_gops: null,
      verified_gops: null,
      tampered_gops: null,
      total_frames: null,
      verified_frames: null,
      tampered_frames: null,
      recording_start: null,
      recording_end: null,
      recording_duration_seconds: null,
      gaps_detected: 0,
      attestation_valid: null,
      public_token: null,
      certificate_url: null,
      completed_at: null,
      created_at: new Date().toISOString(),
    });
  }

  // Check mock data
  const mockVerification = MOCK_VERIFICATIONS.find((v) => v.id === id);
  if (mockVerification) {
    return NextResponse.json({
      id: mockVerification.id,
      status: mockVerification.status,
      file_name: mockVerification.file_name,
      device_serial: mockVerification.device_serial,
      device_model: mockVerification.device_model,
      cert_chain_valid: mockVerification.cert_chain_valid,
      total_gops: mockVerification.total_gops,
      verified_gops: mockVerification.verified_gops,
      tampered_gops: mockVerification.tampered_gops,
      total_frames: mockVerification.total_frames,
      verified_frames: mockVerification.verified_frames,
      tampered_frames: mockVerification.tampered_frames,
      recording_start: mockVerification.recording_start,
      recording_end: mockVerification.recording_end,
      recording_duration_seconds: mockVerification.recording_duration_seconds,
      gaps_detected: mockVerification.gaps_detected,
      attestation_valid: mockVerification.attestation_valid,
      public_token: mockVerification.public_token,
      certificate_url: mockVerification.certificate_url,
      completed_at: mockVerification.completed_at,
      created_at: mockVerification.created_at,
    });
  }

  return NextResponse.json({ error: "Verification not found" }, { status: 404 });
}
