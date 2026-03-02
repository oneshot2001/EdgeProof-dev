import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We need to test the module fresh each time since it uses module-level state
describe("getStripe", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should return null when STRIPE_SECRET_KEY is not set", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripe } = await import("@/lib/stripe/client");
    const stripe = getStripe();
    expect(stripe).toBeNull();
  });

  it("should return null when STRIPE_SECRET_KEY is a placeholder", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder_abc123";
    const { getStripe } = await import("@/lib/stripe/client");
    const stripe = getStripe();
    expect(stripe).toBeNull();
  });

  it("should return a Stripe instance when a valid key is set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_realkey123456789";
    const { getStripe } = await import("@/lib/stripe/client");
    const stripe = getStripe();
    expect(stripe).not.toBeNull();
  });

  it("should return the same instance on subsequent calls (singleton)", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_singletontest";
    const { getStripe } = await import("@/lib/stripe/client");
    const first = getStripe();
    const second = getStripe();
    expect(first).toBe(second);
  });
});
