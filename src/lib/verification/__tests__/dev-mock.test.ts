import { describe, it, expect } from "vitest";
import { generateMockResult } from "@/lib/verification/dev-mock";

describe("generateMockResult", () => {
  describe("filename-based routing", () => {
    it("should return authentic result for normal filenames", () => {
      const result = generateMockResult("test-id-1", "camera-footage.mp4");
      expect(result.status).toBe("authentic");
      expect(result.verification_id).toBe("test-id-1");
    });

    it("should return tampered result when filename contains 'tamper'", () => {
      const result = generateMockResult("test-id-2", "tampered-video.mp4");
      expect(result.status).toBe("tampered");
      expect(result.verification_id).toBe("test-id-2");
    });

    it("should return unsigned result when filename contains 'unsigned'", () => {
      const result = generateMockResult("test-id-3", "unsigned-clip.mp4");
      expect(result.status).toBe("unsigned");
      expect(result.verification_id).toBe("test-id-3");
    });

    it("should be case-insensitive for filename matching", () => {
      expect(generateMockResult("id", "TAMPERED-FILE.mp4").status).toBe("tampered");
      expect(generateMockResult("id", "Unsigned-Video.mp4").status).toBe("unsigned");
      expect(generateMockResult("id", "NORMAL-FILE.mp4").status).toBe("authentic");
    });

    it("should match 'tamper' substring, not just 'tampered'", () => {
      expect(generateMockResult("id", "file-with-tampering.mp4").status).toBe("tampered");
    });

    it("should prioritize tamper over unsigned when both present", () => {
      // The code checks tamper first, so a file with both should return tampered
      const result = generateMockResult("id", "tamper-unsigned.mp4");
      expect(result.status).toBe("tampered");
    });
  });

  describe("authentic result structure", () => {
    const result = generateMockResult("auth-id", "normal-video.mp4");

    it("should have correct verification_id", () => {
      expect(result.verification_id).toBe("auth-id");
    });

    it("should have authentic status", () => {
      expect(result.status).toBe("authentic");
    });

    it("should have positive processing time", () => {
      expect(result.processing_time_ms).toBeGreaterThan(0);
    });

    it("should include device info with serial number", () => {
      expect(result.device.serial_number).toBe("ACCC8EAB1234");
      expect(result.device.model).toBe("AXIS P3265-LVE");
      expect(result.device.firmware_version).toBeTruthy();
    });

    it("should have valid certificate chain", () => {
      expect(result.certificate_chain.valid).toBe(true);
      expect(result.certificate_chain.root_ca).toContain("Axis");
      expect(result.certificate_chain.signature_algorithm).toBe("SHA256withRSA");
    });

    it("should have valid attestation from hardware secure element", () => {
      expect(result.attestation.valid).toBe(true);
      expect(result.attestation.key_origin).toBe("hardware_secure_element");
    });

    it("should have complete integrity data with no tampering", () => {
      expect(result.integrity.total_gops).toBeGreaterThan(0);
      expect(result.integrity.verified_gops).toBe(result.integrity.total_gops);
      expect(result.integrity.tampered_gops).toBe(0);
      expect(result.integrity.total_frames).toBeGreaterThan(0);
      expect(result.integrity.verified_frames).toBe(result.integrity.total_frames);
      expect(result.integrity.tampered_frames).toBe(0);
      expect(result.integrity.gop_chain_intact).toBe(true);
    });

    it("should have temporal data with no gaps", () => {
      expect(result.temporal.recording_start).toBeTruthy();
      expect(result.temporal.recording_end).toBeTruthy();
      expect(result.temporal.duration_seconds).toBeGreaterThan(0);
      expect(result.temporal.gaps_detected).toBe(0);
      expect(result.temporal.gap_details).toHaveLength(0);
    });

    it("should have video metadata with the signing UUID", () => {
      expect(result.video_metadata.codec).toBe("H.264");
      expect(result.video_metadata.container).toBe("MP4");
      expect(result.video_metadata.sei_uuid).toBe(
        "5369676e-6564-2056-6964-656f2e2e2e30"
      );
    });

    it("should have no errors", () => {
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("tampered result structure", () => {
    const result = generateMockResult("tamper-id", "tampered-file.mp4");

    it("should have tampered status", () => {
      expect(result.status).toBe("tampered");
    });

    it("should have some tampered GOPs", () => {
      expect(result.integrity.tampered_gops).toBeGreaterThan(0);
      expect(result.integrity.tampered_frames).toBeGreaterThan(0);
    });

    it("should have broken GOP chain", () => {
      expect(result.integrity.gop_chain_intact).toBe(false);
    });

    it("should have verified_gops < total_gops", () => {
      expect(result.integrity.verified_gops).toBeLessThan(
        result.integrity.total_gops
      );
    });

    it("should have gaps detected", () => {
      expect(result.temporal.gaps_detected).toBeGreaterThan(0);
      expect(result.temporal.gap_details.length).toBe(
        result.temporal.gaps_detected
      );
    });

    it("should have gap detail structure with from/to/gap_seconds", () => {
      const gap = result.temporal.gap_details[0];
      expect(gap).toHaveProperty("from");
      expect(gap).toHaveProperty("to");
      expect(gap).toHaveProperty("gap_seconds");
      expect(gap.gap_seconds).toBeGreaterThan(0);
    });

    it("should have errors describing the tampering", () => {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("GOP chain broken");
    });

    it("should still have valid certificate chain (device is real, video was edited)", () => {
      expect(result.certificate_chain.valid).toBe(true);
    });
  });

  describe("unsigned result structure", () => {
    const result = generateMockResult("unsigned-id", "unsigned-clip.mp4");

    it("should have unsigned status", () => {
      expect(result.status).toBe("unsigned");
    });

    it("should have empty device info", () => {
      expect(result.device.serial_number).toBe("");
      expect(result.device.model).toBe("");
      expect(result.device.firmware_version).toBe("");
    });

    it("should have invalid certificate chain", () => {
      expect(result.certificate_chain.valid).toBe(false);
      expect(result.certificate_chain.root_ca).toBe("");
    });

    it("should have invalid attestation", () => {
      expect(result.attestation.valid).toBe(false);
    });

    it("should have zero integrity data", () => {
      expect(result.integrity.total_gops).toBe(0);
      expect(result.integrity.verified_gops).toBe(0);
      expect(result.integrity.total_frames).toBe(0);
      expect(result.integrity.gop_chain_intact).toBe(false);
    });

    it("should have empty temporal data", () => {
      expect(result.temporal.recording_start).toBe("");
      expect(result.temporal.recording_end).toBe("");
      expect(result.temporal.duration_seconds).toBe(0);
    });

    it("should have empty SEI UUID in video metadata", () => {
      expect(result.video_metadata.sei_uuid).toBe("");
    });

    it("should have errors about missing signed video metadata", () => {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("No signed video metadata");
      expect(result.errors[0]).toContain("5369676e-6564-2056-6964-656f2e2e2e30");
    });
  });
});
