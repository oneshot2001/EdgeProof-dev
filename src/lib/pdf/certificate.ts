import React from "react";
import QRCode from "qrcode";
import { renderToBuffer } from "@react-pdf/renderer";
import { createHash } from "crypto";
import { type CertificateData, type AuditEntry } from "@/types/api";
import { CertificatePDF } from "@/components/certificate/CertificatePDF";

/**
 * Generates a QR code as a data URL for embedding in the certificate PDF.
 * The QR code links to the public verification page.
 */
export async function generateQRCode(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 120,
    margin: 1,
    errorCorrectionLevel: "M",
    color: {
      dark: "#000000",
      light: "#ffffff",
    },
  });
}

/**
 * Extracts the GOP chain intact status from the worker_response JSONB field.
 * The worker response may contain an integrity.chain_intact boolean.
 */
function extractChainIntact(
  workerResponse: Record<string, unknown> | null
): boolean | null {
  if (!workerResponse) return null;
  const integrity = workerResponse.integrity as
    | Record<string, unknown>
    | undefined;
  if (!integrity) return null;
  if (typeof integrity.gop_chain_intact === "boolean") return integrity.gop_chain_intact;
  if (typeof integrity.chain_intact === "boolean") return integrity.chain_intact;
  return null;
}

/**
 * Builds the certificate data structure from a verification database row.
 * This is the canonical transform from DB shape to certificate shape.
 */
export function buildCertificateData(
  verification: {
    id: string;
    status: string;
    file_name: string;
    file_size_bytes: number;
    file_hash_sha256: string;
    device_serial: string | null;
    device_model: string | null;
    device_firmware: string | null;
    device_hardware_id: string | null;
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
    worker_response: Record<string, unknown> | null;
    public_token: string | null;
    completed_at: string | null;
    created_at: string;
    certificate_hash: string | null;
  },
  auditEntries: AuditEntry[] = []
): CertificateData {
  return {
    verificationId: verification.id,
    status: verification.status as CertificateData["status"],
    fileName: verification.file_name,
    fileHash: verification.file_hash_sha256,
    fileSizeBytes: verification.file_size_bytes,
    device: {
      serial: verification.device_serial,
      model: verification.device_model,
      firmware: verification.device_firmware,
      hardwareId: verification.device_hardware_id,
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
      chainIntact: extractChainIntact(verification.worker_response),
      hashAlgorithm: "SHA-256",
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
    auditLog: auditEntries,
    publicToken: verification.public_token,
    verifiedAt: verification.completed_at,
    issuedAt: verification.completed_at || verification.created_at,
    certificateHash: verification.certificate_hash,
  };
}

/**
 * Computes the SHA-256 hash of a PDF buffer and returns it as a hex string.
 * This self-hash is embedded in the certificate metadata for tamper detection.
 */
export function computePdfHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * Formats seconds into a human-readable duration string.
 */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.round(totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(" ");
}

/**
 * Generates the complete PDF buffer from certificate data.
 *
 * Two-pass process:
 * 1. Render PDF without self-hash to get buffer
 * 2. Compute SHA-256 of that buffer — this becomes the certificate's self-hash
 *
 * The self-hash is returned separately so it can be stored in the database
 * and displayed on the certificate page. It is NOT re-embedded into the PDF
 * (that would change the hash). Instead, it appears in the certificate metadata
 * returned alongside the download.
 */
export async function generateCertificatePdf(
  data: CertificateData,
  appUrl: string
): Promise<{ buffer: Buffer; hash: string }> {
  const verifyUrl = data.publicToken
    ? `${appUrl}/verify/${data.publicToken}`
    : `${appUrl}/verify/${data.verificationId}`;

  const qrCodeDataUrl = await generateQRCode(verifyUrl);

  // Self-hash must be computed from a PDF that does not embed the hash itself.
  const pdfData: CertificateData = {
    ...data,
    certificateHash: null,
  };

  const element = React.createElement(CertificatePDF, {
    data: pdfData,
    qrCodeDataUrl,
  });

  // CertificatePDF returns a <Document> component, but TypeScript cannot
  // infer through the wrapper function. The cast is safe because
  // renderToBuffer accepts any react-pdf Document tree.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);
  const hash = computePdfHash(buffer);

  return { buffer, hash };
}
