import { type WorkerVerificationResult } from "@/types/verification";

export const MOCK_AUTHENTIC_RESULT: WorkerVerificationResult = {
  verification_id: "mock-authentic-001",
  status: "authentic",
  processing_time_ms: 12450,
  device: {
    serial_number: "ACCC8EAB1234",
    model: "AXIS P3265-LVE",
    firmware_version: "11.11.65",
    hardware_id: "7A3B2C1D-E4F5-6789-ABCD-EF0123456789",
    axis_os_version: "11.11.65",
  },
  certificate_chain: {
    valid: true,
    device_cert_subject: "CN=ACCC8EAB1234",
    intermediate_ca: "Axis Device ID Intermediate CA RSA 1",
    root_ca: "Axis Device ID Root CA RSA",
    root_ca_expiry: "2060-06-01T00:00:00Z",
    signature_algorithm: "SHA256withRSA",
  },
  attestation: {
    valid: true,
    key_origin: "hardware_secure_element",
    details: "Signing key confirmed bound to device hardware via TPM 2.0 attestation",
  },
  integrity: {
    total_gops: 847,
    verified_gops: 847,
    tampered_gops: 0,
    total_frames: 25410,
    verified_frames: 25410,
    tampered_frames: 0,
    gop_chain_intact: true,
    hash_algorithm: "SHA-256",
  },
  temporal: {
    recording_start: "2026-01-15T14:23:07Z",
    recording_end: "2026-01-15T14:37:42Z",
    duration_seconds: 875,
    gaps_detected: 0,
    gap_details: [],
  },
  video_metadata: {
    codec: "H.264",
    container: "MP4",
    resolution: "1920x1080",
    framerate: 29.0,
    sei_uuid: "5369676e-6564-2056-6964-656f2e2e2e30",
  },
  errors: [],
};

export const MOCK_TAMPERED_RESULT: WorkerVerificationResult = {
  verification_id: "mock-tampered-001",
  status: "tampered",
  processing_time_ms: 8320,
  device: {
    serial_number: "ACCC8EAB5678",
    model: "AXIS Q6135-LE",
    firmware_version: "11.10.42",
    hardware_id: "1B2C3D4E-F5A6-7890-BCDE-F01234567890",
    axis_os_version: "11.10.42",
  },
  certificate_chain: {
    valid: true,
    device_cert_subject: "CN=ACCC8EAB5678",
    intermediate_ca: "Axis Device ID Intermediate CA RSA 2",
    root_ca: "Axis Device ID Root CA RSA",
    root_ca_expiry: "2060-06-01T00:00:00Z",
    signature_algorithm: "SHA256withRSA",
  },
  attestation: {
    valid: true,
    key_origin: "hardware_secure_element",
    details: "Signing key confirmed bound to device hardware via TPM 2.0 attestation",
  },
  integrity: {
    total_gops: 523,
    verified_gops: 489,
    tampered_gops: 34,
    total_frames: 15690,
    verified_frames: 14670,
    tampered_frames: 1020,
    gop_chain_intact: false,
    hash_algorithm: "SHA-256",
  },
  temporal: {
    recording_start: "2026-01-10T09:15:00Z",
    recording_end: "2026-01-10T09:32:18Z",
    duration_seconds: 1038,
    gaps_detected: 2,
    gap_details: [
      { from: "2026-01-10T09:20:12Z", to: "2026-01-10T09:20:45Z", gap_seconds: 33 },
      { from: "2026-01-10T09:28:00Z", to: "2026-01-10T09:28:14Z", gap_seconds: 14 },
    ],
  },
  video_metadata: {
    codec: "H.264",
    container: "MP4",
    resolution: "2560x1440",
    framerate: 15.0,
    sei_uuid: "5369676e-6564-2056-6964-656f2e2e2e30",
  },
  errors: ["GOP chain broken at GOP #312 — possible frame insertion or deletion detected"],
};

export const MOCK_UNSIGNED_RESULT: WorkerVerificationResult = {
  verification_id: "mock-unsigned-001",
  status: "unsigned",
  processing_time_ms: 2150,
  device: {
    serial_number: "",
    model: "",
    firmware_version: "",
    hardware_id: "",
    axis_os_version: "",
  },
  certificate_chain: {
    valid: false,
    device_cert_subject: "",
    intermediate_ca: "",
    root_ca: "",
    root_ca_expiry: "",
    signature_algorithm: "",
  },
  attestation: {
    valid: false,
    key_origin: "",
    details: "No attestation data found — video does not contain signed video metadata",
  },
  integrity: {
    total_gops: 0,
    verified_gops: 0,
    tampered_gops: 0,
    total_frames: 0,
    verified_frames: 0,
    tampered_frames: 0,
    gop_chain_intact: false,
    hash_algorithm: "",
  },
  temporal: {
    recording_start: "",
    recording_end: "",
    duration_seconds: 0,
    gaps_detected: 0,
    gap_details: [],
  },
  video_metadata: {
    codec: "H.264",
    container: "MP4",
    resolution: "1280x720",
    framerate: 30.0,
    sei_uuid: "",
  },
  errors: [
    "No signed video metadata (SEI NALU with UUID 5369676e-6564-2056-6964-656f2e2e2e30) found in video stream",
  ],
};

export function getMockResult(
  scenario: "authentic" | "tampered" | "unsigned" = "authentic"
): WorkerVerificationResult {
  switch (scenario) {
    case "authentic":
      return { ...MOCK_AUTHENTIC_RESULT };
    case "tampered":
      return { ...MOCK_TAMPERED_RESULT };
    case "unsigned":
      return { ...MOCK_UNSIGNED_RESULT };
  }
}
