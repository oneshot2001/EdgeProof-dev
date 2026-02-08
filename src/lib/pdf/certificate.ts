import QRCode from "qrcode";
import { type CertificateData } from "@/types/api";

export async function generateQRCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 120,
    margin: 1,
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

export function buildCertificateData(verification: {
  id: string;
  status: string;
  file_name: string;
  file_hash_sha256: string;
  device_serial: string | null;
  device_model: string | null;
  device_firmware: string | null;
  cert_chain_valid: boolean | null;
  cert_intermediate: string | null;
  cert_root: string | null;
  total_gops: number | null;
  verified_gops: number | null;
  tampered_gops: number | null;
  total_frames: number | null;
  verified_frames: number | null;
  tampered_frames: number | null;
  recording_start: string | null;
  recording_end: string | null;
  recording_duration_seconds: number | null;
  gaps_detected: number;
  attestation_valid: boolean | null;
  attestation_details: Record<string, unknown> | null;
  public_token: string | null;
  completed_at: string | null;
}): CertificateData {
  return {
    verificationId: verification.id,
    status: verification.status as CertificateData["status"],
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
}
