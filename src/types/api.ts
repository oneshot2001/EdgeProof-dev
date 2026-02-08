import { type VerificationStatus } from "./database";

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface UploadRequest {
  fileName: string;
  fileSizeBytes: number;
  contentType: string;
}

export interface UploadResponse {
  uploadUrl: string;
  filePath: string;
  verificationId: string;
}

export interface VerifyRequest {
  verificationId: string;
  filePath: string;
  fileName: string;
  fileSizeBytes: number;
  fileHash: string;
}

export interface VerifyResponse {
  verificationId: string;
  status: VerificationStatus;
}

export interface VerificationPollResponse {
  id: string;
  status: VerificationStatus;
  file_name: string;
  device_serial: string | null;
  device_model: string | null;
  cert_chain_valid: boolean | null;
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
  public_token: string | null;
  certificate_url: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface CertificateData {
  verificationId: string;
  status: VerificationStatus;
  fileName: string;
  fileHash: string;
  device: {
    serial: string | null;
    model: string | null;
    firmware: string | null;
  };
  certificateChain: {
    valid: boolean | null;
    intermediate: string | null;
    root: string | null;
  };
  integrity: {
    totalGops: number | null;
    verifiedGops: number | null;
    tamperedGops: number | null;
    totalFrames: number | null;
    verifiedFrames: number | null;
    tamperedFrames: number | null;
  };
  temporal: {
    recordingStart: string | null;
    recordingEnd: string | null;
    durationSeconds: number | null;
    gapsDetected: number;
  };
  attestation: {
    valid: boolean | null;
    details: Record<string, unknown> | null;
  };
  publicToken: string | null;
  verifiedAt: string | null;
  issuedAt: string;
}
