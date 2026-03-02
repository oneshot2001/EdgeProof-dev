import { describe, it, expect } from "vitest";
import { STRIPE_PRICES, getPriceForTier } from "@/lib/stripe/products";

describe("STRIPE_PRICES", () => {
  it("should define a pro price mapping", () => {
    expect(STRIPE_PRICES.pro).toBeDefined();
    expect(STRIPE_PRICES.pro.tier).toBe("professional");
    expect(STRIPE_PRICES.pro.productName).toBe("EdgeProof Pro");
    expect(STRIPE_PRICES.pro.amount).toBe(9900); // $99 in cents
    expect(STRIPE_PRICES.pro.interval).toBe("month");
  });

  it("should define an enterprise price mapping", () => {
    expect(STRIPE_PRICES.enterprise).toBeDefined();
    expect(STRIPE_PRICES.enterprise.tier).toBe("enterprise");
    expect(STRIPE_PRICES.enterprise.productName).toBe("EdgeProof Enterprise");
    expect(STRIPE_PRICES.enterprise.amount).toBe(49900); // $499 in cents
    expect(STRIPE_PRICES.enterprise.interval).toBe("month");
  });

  it("should define a pay-per-use price mapping", () => {
    expect(STRIPE_PRICES.payPerUse).toBeDefined();
    expect(STRIPE_PRICES.payPerUse.tier).toBe("free");
    expect(STRIPE_PRICES.payPerUse.productName).toBe("EdgeProof Pay-Per-Use");
    expect(STRIPE_PRICES.payPerUse.amount).toBe(500); // $5 in cents
  });

  it("should have a priceId for each product (may be placeholder)", () => {
    for (const key of Object.keys(STRIPE_PRICES)) {
      expect(STRIPE_PRICES[key].priceId).toBeTruthy();
    }
  });

  it("should have amounts in cents (positive integers)", () => {
    for (const key of Object.keys(STRIPE_PRICES)) {
      expect(STRIPE_PRICES[key].amount).toBeGreaterThan(0);
      expect(Number.isInteger(STRIPE_PRICES[key].amount)).toBe(true);
    }
  });
});

describe("getPriceForTier", () => {
  it("should return null for free tier", () => {
    const result = getPriceForTier("free");
    expect(result).toBeNull();
  });

  it("should return the pro price for professional tier", () => {
    const result = getPriceForTier("professional");
    expect(result).not.toBeNull();
    expect(result?.tier).toBe("professional");
    expect(result?.amount).toBe(9900);
  });

  it("should return the enterprise price for enterprise tier", () => {
    const result = getPriceForTier("enterprise");
    expect(result).not.toBeNull();
    expect(result?.tier).toBe("enterprise");
    expect(result?.amount).toBe(49900);
  });
});
