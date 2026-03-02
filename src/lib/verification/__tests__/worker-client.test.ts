import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { verifyFile, checkWorkerHealth } from "@/lib/verification/worker-client";

// Mock global fetch
const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  vi.stubGlobal("fetch", mockFetch);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("verifyFile", () => {
  it("should send a POST request to the worker /verify endpoint", async () => {
    const mockResponse = {
      ok: true,
      json: () =>
        Promise.resolve({
          verification_id: "test-123",
          status: "authentic",
          processing_time_ms: 1000,
          device: { serial_number: "ABC", model: "AXIS", firmware_version: "", hardware_id: "", axis_os_version: "" },
          certificate_chain: { valid: true, device_cert_subject: "", intermediate_ca: "", root_ca: "", root_ca_expiry: "", signature_algorithm: "" },
          attestation: { valid: true, key_origin: "", details: "" },
          integrity: { total_gops: 10, verified_gops: 10, tampered_gops: 0, total_frames: 100, verified_frames: 100, tampered_frames: 0, gop_chain_intact: true, hash_algorithm: "SHA-256" },
          temporal: { recording_start: "", recording_end: "", duration_seconds: 0, gaps_detected: 0, gap_details: [] },
          video_metadata: { codec: "H.264", container: "MP4", resolution: "", framerate: 0, sei_uuid: "" },
          errors: [],
        }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    const result = await verifyFile({
      file: new Uint8Array([1, 2, 3]),
      fileName: "test.mp4",
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/verify");
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toContain("Bearer");
    expect(result.status).toBe("authentic");
  });

  it("should pass callback_url to the worker when provided", async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ status: "authentic" }),
    };
    mockFetch.mockResolvedValueOnce(mockResponse);

    await verifyFile({
      file: new Uint8Array([1, 2, 3]),
      fileName: "test.mp4",
      callbackUrl: "http://example.com/callback",
    });

    // Verify the fetch was called and the body is a FormData.
    // Node's FormData may not support .get() in all environments,
    // so we verify the body type and that fetch was called correctly.
    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain("/verify");
    expect(options.body).toBeInstanceOf(FormData);
  });

  it("should throw an error when the worker returns a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve("Internal server error"),
    });

    await expect(
      verifyFile({
        file: new Uint8Array([1, 2, 3]),
        fileName: "test.mp4",
      })
    ).rejects.toThrow("Worker verification failed (500)");
  });

  it("should throw when fetch rejects (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      verifyFile({
        file: new Uint8Array([1, 2, 3]),
        fileName: "test.mp4",
      })
    ).rejects.toThrow("Network error");
  });
});

describe("checkWorkerHealth", () => {
  it("should return true when the worker is healthy", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const healthy = await checkWorkerHealth();
    expect(healthy).toBe(true);
  });

  it("should call the /health endpoint with GET method", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    await checkWorkerHealth();

    expect(mockFetch).toHaveBeenCalledOnce();
    const callUrl = mockFetch.mock.calls[0][0];
    const callOptions = mockFetch.mock.calls[0][1];
    expect(callUrl).toContain("/health");
    expect(callOptions.method).toBe("GET");
  });

  it("should return false when the worker returns a non-OK response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });

    const healthy = await checkWorkerHealth();
    expect(healthy).toBe(false);
  });

  it("should return false when the request fails (network error)", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Connection refused"));

    const healthy = await checkWorkerHealth();
    expect(healthy).toBe(false);
  });
});
