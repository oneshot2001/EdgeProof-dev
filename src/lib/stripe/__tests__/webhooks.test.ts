import { describe, it, expect, vi, beforeEach } from "vitest";
import type Stripe from "stripe";

// Mock Supabase service client
const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  }),
});

const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ data: { id: "user-123" }, error: null }),
  }),
});

const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null });

const mockFrom = vi.fn().mockImplementation((table: string) => ({
  update: mockUpdate,
  select: mockSelect,
  insert: mockInsert,
}));

vi.mock("@/lib/supabase/server", () => ({
  createServiceClient: vi.fn().mockResolvedValue({
    from: (table: string) => mockFrom(table),
  }),
}));

// Import after mocking
import { handleStripeWebhook } from "@/lib/stripe/webhooks";

beforeEach(() => {
  vi.clearAllMocks();
  // Reset the chain for each test
  mockUpdate.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  });
  mockSelect.mockReturnValue({
    eq: vi.fn().mockReturnValue({
      single: vi.fn().mockResolvedValue({ data: { id: "user-123" }, error: null }),
    }),
  });
});

function makeEvent(type: string, data: Record<string, unknown>): Stripe.Event {
  return {
    id: `evt_${Date.now()}`,
    type,
    data: { object: data },
  } as unknown as Stripe.Event;
}

describe("handleStripeWebhook", () => {
  describe("checkout.session.completed", () => {
    it("should update user subscription tier and stripe customer ID", async () => {
      const event = makeEvent("checkout.session.completed", {
        metadata: { user_id: "user-abc", tier: "professional" },
        customer: "cus_stripe123",
      });

      await handleStripeWebhook(event);

      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_tier: "professional",
          stripe_customer_id: "cus_stripe123",
        })
      );
    });

    it("should default to professional tier when tier metadata is missing", async () => {
      const event = makeEvent("checkout.session.completed", {
        metadata: { user_id: "user-abc" },
        customer: "cus_stripe456",
      });

      await handleStripeWebhook(event);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_tier: "professional",
        })
      );
    });

    it("should log error and return when user_id metadata is missing", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const event = makeEvent("checkout.session.completed", {
        metadata: {},
        customer: "cus_stripe789",
      });

      await handleStripeWebhook(event);

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("missing user_id")
      );
      // Should not call update when user_id is missing
      expect(mockUpdate).not.toHaveBeenCalled();

      consoleError.mockRestore();
    });
  });

  describe("customer.subscription.deleted", () => {
    it("should downgrade user to free tier", async () => {
      const event = makeEvent("customer.subscription.deleted", {
        customer: "cus_down123",
      });

      await handleStripeWebhook(event);

      expect(mockFrom).toHaveBeenCalledWith("users");
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          subscription_tier: "free",
        })
      );
    });

    it("should log error when no user found for customer", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      // Override select to return no user
      mockSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const event = makeEvent("customer.subscription.deleted", {
        customer: "cus_nonexistent",
      });

      await handleStripeWebhook(event);

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("no user found"),
        "cus_nonexistent"
      );

      consoleError.mockRestore();
    });
  });

  describe("invoice.payment_succeeded", () => {
    it("should log the payment success without errors", async () => {
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

      const event = makeEvent("invoice.payment_succeeded", {
        id: "inv_success123",
        customer: "cus_pay123",
      });

      await handleStripeWebhook(event);

      expect(consoleLog).toHaveBeenCalledWith(
        "Payment succeeded:",
        "inv_success123"
      );

      consoleLog.mockRestore();
    });
  });

  describe("invoice.payment_failed", () => {
    it("should log the payment failure", async () => {
      const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

      const event = makeEvent("invoice.payment_failed", {
        id: "inv_fail123",
        customer: "cus_fail123",
      });

      await handleStripeWebhook(event);

      expect(consoleError).toHaveBeenCalledWith(
        expect.stringContaining("Payment failed"),
        "cus_fail123",
        "invoice:",
        "inv_fail123"
      );

      consoleError.mockRestore();
    });
  });

  describe("unhandled event types", () => {
    it("should log unhandled event types without throwing", async () => {
      const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

      const event = makeEvent("some.unknown.event", { foo: "bar" });

      await expect(handleStripeWebhook(event)).resolves.toBeUndefined();

      expect(consoleLog).toHaveBeenCalledWith(
        "Unhandled Stripe event type:",
        "some.unknown.event"
      );

      consoleLog.mockRestore();
    });
  });
});
