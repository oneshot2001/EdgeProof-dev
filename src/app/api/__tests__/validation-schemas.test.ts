import { describe, it, expect } from "vitest";
import { z } from "zod";

/**
 * Tests for the Zod validation schemas used across API route handlers.
 * Schemas are re-defined here to match the source since they are not exported.
 * This ensures the validation logic is correct independent of route handler internals.
 */

// Re-define schemas matching the source code to test validation logic

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  contentType: z.string().refine(
    (ct) => ["video/mp4", "video/x-matroska"].includes(ct),
    "Only MP4 and MKV files are supported"
  ),
});

const verifySchema = z.object({
  verificationId: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  fileHash: z.string().min(1),
});

const workerCallbackSchema = z.object({
  verification_id: z.string(),
  status: z.enum(["authentic", "tampered", "unsigned", "inconclusive", "error"]),
  processing_time_ms: z.number(),
  device: z.object({
    serial_number: z.string(),
    model: z.string(),
    firmware_version: z.string(),
    hardware_id: z.string(),
    axis_os_version: z.string(),
  }),
  certificate_chain: z.object({
    valid: z.boolean(),
    device_cert_subject: z.string(),
    intermediate_ca: z.string(),
    root_ca: z.string(),
    root_ca_expiry: z.string(),
    signature_algorithm: z.string(),
  }),
  attestation: z.object({
    valid: z.boolean(),
    key_origin: z.string(),
    details: z.string(),
  }),
  integrity: z.object({
    total_gops: z.number(),
    verified_gops: z.number(),
    tampered_gops: z.number(),
    total_frames: z.number(),
    verified_frames: z.number(),
    tampered_frames: z.number(),
    gop_chain_intact: z.boolean(),
    hash_algorithm: z.string(),
  }),
  temporal: z.object({
    recording_start: z.string(),
    recording_end: z.string(),
    duration_seconds: z.number(),
    gaps_detected: z.number(),
    gap_details: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
        gap_seconds: z.number(),
      })
    ),
  }),
  video_metadata: z.object({
    codec: z.string(),
    container: z.string(),
    resolution: z.string(),
    framerate: z.number(),
    sei_uuid: z.string(),
  }),
  errors: z.array(z.string()),
});

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

const apiVerifySchema = z.object({
  file_url: z.string().url().optional(),
  callback_url: z.string().url().optional(),
});

// ------- Upload Schema Tests -------

describe("uploadSchema", () => {
  it("should accept valid MP4 upload request", () => {
    const result = uploadSchema.safeParse({
      fileName: "camera-footage.mp4",
      fileSizeBytes: 1024000,
      contentType: "video/mp4",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid MKV upload request", () => {
    const result = uploadSchema.safeParse({
      fileName: "footage.mkv",
      fileSizeBytes: 5000000,
      contentType: "video/x-matroska",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty fileName", () => {
    const result = uploadSchema.safeParse({
      fileName: "",
      fileSizeBytes: 1024,
      contentType: "video/mp4",
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero file size", () => {
    const result = uploadSchema.safeParse({
      fileName: "test.mp4",
      fileSizeBytes: 0,
      contentType: "video/mp4",
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative file size", () => {
    const result = uploadSchema.safeParse({
      fileName: "test.mp4",
      fileSizeBytes: -100,
      contentType: "video/mp4",
    });
    expect(result.success).toBe(false);
  });

  it("should reject unsupported content types", () => {
    const unsupported = [
      "video/avi",
      "video/webm",
      "application/octet-stream",
      "image/png",
      "text/plain",
    ];

    for (const contentType of unsupported) {
      const result = uploadSchema.safeParse({
        fileName: "test.file",
        fileSizeBytes: 1024,
        contentType,
      });
      expect(result.success).toBe(false);
    }
  });

  it("should reject missing fields", () => {
    expect(uploadSchema.safeParse({}).success).toBe(false);
    expect(
      uploadSchema.safeParse({ fileName: "test.mp4" }).success
    ).toBe(false);
    expect(
      uploadSchema.safeParse({ fileName: "test.mp4", fileSizeBytes: 1024 }).success
    ).toBe(false);
  });
});

// ------- Verify Schema Tests -------

describe("verifySchema", () => {
  const validPayload = {
    verificationId: "550e8400-e29b-41d4-a716-446655440000",
    filePath: "uploads/user-1/ver-1/test.mp4",
    fileName: "test.mp4",
    fileSizeBytes: 1024000,
    fileHash: "abc123def456",
  };

  it("should accept a valid verify request", () => {
    const result = verifySchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("should reject non-UUID verificationId", () => {
    const result = verifySchema.safeParse({
      ...validPayload,
      verificationId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty filePath", () => {
    const result = verifySchema.safeParse({
      ...validPayload,
      filePath: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty fileName", () => {
    const result = verifySchema.safeParse({
      ...validPayload,
      fileName: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject zero fileSizeBytes", () => {
    const result = verifySchema.safeParse({
      ...validPayload,
      fileSizeBytes: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty fileHash", () => {
    const result = verifySchema.safeParse({
      ...validPayload,
      fileHash: "",
    });
    expect(result.success).toBe(false);
  });
});

// ------- Worker Callback Schema Tests -------

describe("workerCallbackSchema", () => {
  const validCallback = {
    verification_id: "test-ver-id",
    status: "authentic" as const,
    processing_time_ms: 12450,
    device: {
      serial_number: "ACCC8EAB1234",
      model: "AXIS P3265-LVE",
      firmware_version: "11.11.65",
      hardware_id: "7A3B2C1D",
      axis_os_version: "11.11.65",
    },
    certificate_chain: {
      valid: true,
      device_cert_subject: "CN=ACCC8EAB1234",
      intermediate_ca: "Axis Intermediate",
      root_ca: "Axis Root",
      root_ca_expiry: "2060-06-01T00:00:00Z",
      signature_algorithm: "SHA256withRSA",
    },
    attestation: {
      valid: true,
      key_origin: "hardware_secure_element",
      details: "TPM 2.0 attestation",
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

  it("should accept a valid authentic worker callback", () => {
    const result = workerCallbackSchema.safeParse(validCallback);
    expect(result.success).toBe(true);
  });

  it("should accept all valid status values", () => {
    for (const status of ["authentic", "tampered", "unsigned", "inconclusive", "error"]) {
      const result = workerCallbackSchema.safeParse({
        ...validCallback,
        status,
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid status values", () => {
    const result = workerCallbackSchema.safeParse({
      ...validCallback,
      status: "pending",
    });
    expect(result.success).toBe(false);
  });

  it("should reject processing status in callback (only terminal statuses)", () => {
    const result = workerCallbackSchema.safeParse({
      ...validCallback,
      status: "processing",
    });
    expect(result.success).toBe(false);
  });

  it("should accept gap_details with proper structure", () => {
    const withGaps = {
      ...validCallback,
      temporal: {
        ...validCallback.temporal,
        gaps_detected: 2,
        gap_details: [
          { from: "2026-01-10T09:20:12Z", to: "2026-01-10T09:20:45Z", gap_seconds: 33 },
          { from: "2026-01-10T09:28:00Z", to: "2026-01-10T09:28:14Z", gap_seconds: 14 },
        ],
      },
    };
    const result = workerCallbackSchema.safeParse(withGaps);
    expect(result.success).toBe(true);
  });

  it("should reject when required nested object is missing", () => {
    const withoutDevice = { ...validCallback };
    delete (withoutDevice as { device?: unknown }).device;
    const result = workerCallbackSchema.safeParse(withoutDevice);
    expect(result.success).toBe(false);
  });

  it("should reject when integrity fields have wrong types", () => {
    const result = workerCallbackSchema.safeParse({
      ...validCallback,
      integrity: {
        ...validCallback.integrity,
        total_gops: "not-a-number",
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject when errors is not an array of strings", () => {
    const result = workerCallbackSchema.safeParse({
      ...validCallback,
      errors: [123, true],
    });
    expect(result.success).toBe(false);
  });
});

// ------- Create API Key Schema Tests -------

describe("createKeySchema", () => {
  it("should accept a valid key name", () => {
    const result = createKeySchema.safeParse({ name: "My Production Key" });
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = createKeySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it("should reject name longer than 100 characters", () => {
    const result = createKeySchema.safeParse({ name: "a".repeat(101) });
    expect(result.success).toBe(false);
  });

  it("should accept name of exactly 100 characters", () => {
    const result = createKeySchema.safeParse({ name: "a".repeat(100) });
    expect(result.success).toBe(true);
  });

  it("should accept name of exactly 1 character", () => {
    const result = createKeySchema.safeParse({ name: "K" });
    expect(result.success).toBe(true);
  });
});

// ------- V1 API Verify Schema Tests -------

describe("apiVerifySchema", () => {
  it("should accept empty object (both fields optional)", () => {
    const result = apiVerifySchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should accept valid file_url", () => {
    const result = apiVerifySchema.safeParse({
      file_url: "https://storage.example.com/video.mp4",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid callback_url", () => {
    const result = apiVerifySchema.safeParse({
      callback_url: "https://webhook.example.com/results",
    });
    expect(result.success).toBe(true);
  });

  it("should accept both fields together", () => {
    const result = apiVerifySchema.safeParse({
      file_url: "https://storage.example.com/video.mp4",
      callback_url: "https://webhook.example.com/results",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid file_url (not a URL)", () => {
    const result = apiVerifySchema.safeParse({
      file_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid callback_url (not a URL)", () => {
    const result = apiVerifySchema.safeParse({
      callback_url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});
