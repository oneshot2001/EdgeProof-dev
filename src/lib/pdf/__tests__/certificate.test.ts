import { describe, it, expect, vi } from "vitest";
import { buildCertificateData } from "@/lib/pdf/certificate";
import type { CertificateData } from "@/types/api";

// Mock qrcode module since generateQRCode depends on it
vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockQRCode"),
  },
}));

describe("buildCertificateData", () => {
  const fullVerification = {
    id: "ver-001",
    status: "authentic",
    file_name: "camera-footage.mp4",
    file_size_bytes: 1048576,
    file_hash_sha256: "abc123def456",
    device_serial: "ACCC8EAB1234",
    device_model: "AXIS P3265-LVE",
    device_firmware: "11.11.65",
    device_hardware_id: "HW-001",
    cert_chain_valid: true,
    cert_intermediate: "Axis Device ID Intermediate CA RSA 1",
    cert_root: "Axis Device ID Root CA RSA",
    total_gops: 847,
    verified_gops: 847,
    tampered_gops: 0,
    total_frames: 25410,
    verified_frames: 25410,
    tampered_frames: 0,
    recording_start: "2026-01-15T14:23:07Z",
    recording_end: "2026-01-15T14:37:42Z",
    recording_duration_seconds: 875,
    gaps_detected: 0,
    attestation_valid: true,
    attestation_details: { key_origin: "hardware_secure_element" },
    worker_response: {
      integrity: { gop_chain_intact: true },
    },
    public_token: "pub_abc123def456",
    completed_at: "2026-01-15T14:38:12Z",
    created_at: "2026-01-15T14:20:00Z",
    certificate_hash: null,
  };

  it("should map verification ID correctly", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.verificationId).toBe("ver-001");
  });

  it("should map status correctly", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.status).toBe("authentic");
  });

  it("should map file name and hash", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.fileName).toBe("camera-footage.mp4");
    expect(result.fileHash).toBe("abc123def456");
  });

  it("should map device info", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.device.serial).toBe("ACCC8EAB1234");
    expect(result.device.model).toBe("AXIS P3265-LVE");
    expect(result.device.firmware).toBe("11.11.65");
  });

  it("should map certificate chain info", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.certificateChain.valid).toBe(true);
    expect(result.certificateChain.intermediate).toBe(
      "Axis Device ID Intermediate CA RSA 1"
    );
    expect(result.certificateChain.root).toBe("Axis Device ID Root CA RSA");
  });

  it("should map integrity data", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.integrity.totalGops).toBe(847);
    expect(result.integrity.verifiedGops).toBe(847);
    expect(result.integrity.tamperedGops).toBe(0);
    expect(result.integrity.totalFrames).toBe(25410);
    expect(result.integrity.verifiedFrames).toBe(25410);
    expect(result.integrity.tamperedFrames).toBe(0);
  });

  it("should map temporal data", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.temporal.recordingStart).toBe("2026-01-15T14:23:07Z");
    expect(result.temporal.recordingEnd).toBe("2026-01-15T14:37:42Z");
    expect(result.temporal.durationSeconds).toBe(875);
    expect(result.temporal.gapsDetected).toBe(0);
  });

  it("should map attestation data", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.attestation.valid).toBe(true);
    expect(result.attestation.details).toEqual({
      key_origin: "hardware_secure_element",
    });
  });

  it("should map public token and timestamps", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.publicToken).toBe("pub_abc123def456");
    expect(result.verifiedAt).toBe("2026-01-15T14:38:12Z");
  });

  it("should set issuedAt from completed_at when available", () => {
    const result = buildCertificateData(fullVerification);
    expect(result.issuedAt).toBe("2026-01-15T14:38:12Z");
  });

  describe("nullable fields", () => {
    const nullVerification = {
      id: "ver-null",
      status: "unsigned",
      file_name: "unknown.mp4",
      file_size_bytes: 2048,
      file_hash_sha256: "empty",
      device_serial: null,
      device_model: null,
      device_firmware: null,
      device_hardware_id: null,
      cert_chain_valid: null,
      cert_intermediate: null,
      cert_root: null,
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
      attestation_details: null,
      worker_response: null,
      public_token: null,
      completed_at: null,
      created_at: "2026-01-10T00:00:00Z",
      certificate_hash: null,
    };

    it("should handle null device info gracefully", () => {
      const result = buildCertificateData(nullVerification);
      expect(result.device.serial).toBeNull();
      expect(result.device.model).toBeNull();
      expect(result.device.firmware).toBeNull();
    });

    it("should handle null certificate chain", () => {
      const result = buildCertificateData(nullVerification);
      expect(result.certificateChain.valid).toBeNull();
      expect(result.certificateChain.intermediate).toBeNull();
      expect(result.certificateChain.root).toBeNull();
    });

    it("should handle null integrity data", () => {
      const result = buildCertificateData(nullVerification);
      expect(result.integrity.totalGops).toBeNull();
      expect(result.integrity.verifiedGops).toBeNull();
      expect(result.integrity.tamperedGops).toBeNull();
      expect(result.integrity.totalFrames).toBeNull();
      expect(result.integrity.verifiedFrames).toBeNull();
      expect(result.integrity.tamperedFrames).toBeNull();
    });

    it("should handle null temporal data", () => {
      const result = buildCertificateData(nullVerification);
      expect(result.temporal.recordingStart).toBeNull();
      expect(result.temporal.recordingEnd).toBeNull();
      expect(result.temporal.durationSeconds).toBeNull();
      expect(result.temporal.gapsDetected).toBe(0);
    });

    it("should handle null attestation data", () => {
      const result = buildCertificateData(nullVerification);
      expect(result.attestation.valid).toBeNull();
      expect(result.attestation.details).toBeNull();
    });

    it("should handle null public token and completed_at", () => {
      const result = buildCertificateData(nullVerification);
      expect(result.publicToken).toBeNull();
      expect(result.verifiedAt).toBeNull();
      expect(result.issuedAt).toBe("2026-01-10T00:00:00Z");
    });
  });

  describe("return type conformance", () => {
    it("should return an object conforming to CertificateData", () => {
      const result: CertificateData = buildCertificateData(fullVerification);

      // Verify all required top-level fields exist
      expect(result).toHaveProperty("verificationId");
      expect(result).toHaveProperty("status");
      expect(result).toHaveProperty("fileName");
      expect(result).toHaveProperty("fileHash");
      expect(result).toHaveProperty("device");
      expect(result).toHaveProperty("certificateChain");
      expect(result).toHaveProperty("integrity");
      expect(result).toHaveProperty("temporal");
      expect(result).toHaveProperty("attestation");
      expect(result).toHaveProperty("publicToken");
      expect(result).toHaveProperty("verifiedAt");
      expect(result).toHaveProperty("issuedAt");
    });
  });
});
