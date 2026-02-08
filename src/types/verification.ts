export type WorkerVerificationStatus =
  | "authentic"
  | "tampered"
  | "unsigned"
  | "inconclusive"
  | "error";

export interface WorkerDeviceInfo {
  serial_number: string;
  model: string;
  firmware_version: string;
  hardware_id: string;
  axis_os_version: string;
}

export interface WorkerCertificateChain {
  valid: boolean;
  device_cert_subject: string;
  intermediate_ca: string;
  root_ca: string;
  root_ca_expiry: string;
  signature_algorithm: string;
}

export interface WorkerAttestation {
  valid: boolean;
  key_origin: string;
  details: string;
}

export interface WorkerIntegrity {
  total_gops: number;
  verified_gops: number;
  tampered_gops: number;
  total_frames: number;
  verified_frames: number;
  tampered_frames: number;
  gop_chain_intact: boolean;
  hash_algorithm: string;
}

export interface WorkerGapDetail {
  from: string;
  to: string;
  gap_seconds: number;
}

export interface WorkerTemporal {
  recording_start: string;
  recording_end: string;
  duration_seconds: number;
  gaps_detected: number;
  gap_details: WorkerGapDetail[];
}

export interface WorkerVideoMetadata {
  codec: string;
  container: string;
  resolution: string;
  framerate: number;
  sei_uuid: string;
}

export interface WorkerVerificationResult {
  verification_id: string;
  status: WorkerVerificationStatus;
  processing_time_ms: number;
  device: WorkerDeviceInfo;
  certificate_chain: WorkerCertificateChain;
  attestation: WorkerAttestation;
  integrity: WorkerIntegrity;
  temporal: WorkerTemporal;
  video_metadata: WorkerVideoMetadata;
  errors: string[];
}
