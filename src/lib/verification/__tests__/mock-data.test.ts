import { describe, it, expect } from "vitest";
import {
  MOCK_AUTHENTIC_RESULT,
  MOCK_TAMPERED_RESULT,
  MOCK_UNSIGNED_RESULT,
  getMockResult,
} from "@/lib/verification/mock-data";
import type { WorkerVerificationResult } from "@/types/verification";

describe("MOCK_AUTHENTIC_RESULT", () => {
  it("should have authentic status", () => {
    expect(MOCK_AUTHENTIC_RESULT.status).toBe("authentic");
  });

  it("should have a verification_id", () => {
    expect(MOCK_AUTHENTIC_RESULT.verification_id).toBeTruthy();
  });

  it("should have complete device info", () => {
    expect(MOCK_AUTHENTIC_RESULT.device.serial_number).toBeTruthy();
    expect(MOCK_AUTHENTIC_RESULT.device.model).toBeTruthy();
    expect(MOCK_AUTHENTIC_RESULT.device.firmware_version).toBeTruthy();
  });

  it("should have all verified GOPs matching total GOPs", () => {
    expect(MOCK_AUTHENTIC_RESULT.integrity.verified_gops).toBe(
      MOCK_AUTHENTIC_RESULT.integrity.total_gops
    );
    expect(MOCK_AUTHENTIC_RESULT.integrity.tampered_gops).toBe(0);
  });

  it("should have intact GOP chain", () => {
    expect(MOCK_AUTHENTIC_RESULT.integrity.gop_chain_intact).toBe(true);
  });

  it("should have no errors", () => {
    expect(MOCK_AUTHENTIC_RESULT.errors).toHaveLength(0);
  });
});

describe("MOCK_TAMPERED_RESULT", () => {
  it("should have tampered status", () => {
    expect(MOCK_TAMPERED_RESULT.status).toBe("tampered");
  });

  it("should have non-zero tampered GOPs and frames", () => {
    expect(MOCK_TAMPERED_RESULT.integrity.tampered_gops).toBeGreaterThan(0);
    expect(MOCK_TAMPERED_RESULT.integrity.tampered_frames).toBeGreaterThan(0);
  });

  it("should have broken GOP chain", () => {
    expect(MOCK_TAMPERED_RESULT.integrity.gop_chain_intact).toBe(false);
  });

  it("should have gap details matching gaps_detected count", () => {
    expect(MOCK_TAMPERED_RESULT.temporal.gap_details).toHaveLength(
      MOCK_TAMPERED_RESULT.temporal.gaps_detected
    );
  });

  it("should have errors describing the tampering", () => {
    expect(MOCK_TAMPERED_RESULT.errors.length).toBeGreaterThan(0);
  });
});

describe("MOCK_UNSIGNED_RESULT", () => {
  it("should have unsigned status", () => {
    expect(MOCK_UNSIGNED_RESULT.status).toBe("unsigned");
  });

  it("should have empty device info", () => {
    expect(MOCK_UNSIGNED_RESULT.device.serial_number).toBe("");
    expect(MOCK_UNSIGNED_RESULT.device.model).toBe("");
  });

  it("should have invalid certificate chain", () => {
    expect(MOCK_UNSIGNED_RESULT.certificate_chain.valid).toBe(false);
  });

  it("should have zero integrity counts", () => {
    expect(MOCK_UNSIGNED_RESULT.integrity.total_gops).toBe(0);
    expect(MOCK_UNSIGNED_RESULT.integrity.total_frames).toBe(0);
  });
});

describe("getMockResult", () => {
  it("should return authentic result by default", () => {
    const result = getMockResult();
    expect(result.status).toBe("authentic");
  });

  it("should return authentic result for 'authentic' scenario", () => {
    const result = getMockResult("authentic");
    expect(result.status).toBe("authentic");
  });

  it("should return tampered result for 'tampered' scenario", () => {
    const result = getMockResult("tampered");
    expect(result.status).toBe("tampered");
  });

  it("should return unsigned result for 'unsigned' scenario", () => {
    const result = getMockResult("unsigned");
    expect(result.status).toBe("unsigned");
  });

  it("should return a new copy each time (not a reference to the constant)", () => {
    const result1 = getMockResult("authentic");
    const result2 = getMockResult("authentic");
    expect(result1).toEqual(result2);
    expect(result1).not.toBe(result2); // Different object references
  });

  it("should return results conforming to WorkerVerificationResult type", () => {
    const result: WorkerVerificationResult = getMockResult("authentic");
    expect(result).toHaveProperty("verification_id");
    expect(result).toHaveProperty("status");
    expect(result).toHaveProperty("processing_time_ms");
    expect(result).toHaveProperty("device");
    expect(result).toHaveProperty("certificate_chain");
    expect(result).toHaveProperty("attestation");
    expect(result).toHaveProperty("integrity");
    expect(result).toHaveProperty("temporal");
    expect(result).toHaveProperty("video_metadata");
    expect(result).toHaveProperty("errors");
  });
});
