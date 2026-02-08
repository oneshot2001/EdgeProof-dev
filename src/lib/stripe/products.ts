import { type SubscriptionTier } from "@/lib/constants";

interface StripePriceMapping {
  tier: SubscriptionTier;
  priceId: string;
  productName: string;
  amount: number;
  interval: "month";
}

export const STRIPE_PRICES: Record<string, StripePriceMapping> = {
  pro: {
    tier: "professional",
    priceId: process.env.STRIPE_PRICE_PRO_MONTHLY || "price_placeholder_pro",
    productName: "EdgeProof Pro",
    amount: 9900, // cents
    interval: "month",
  },
  enterprise: {
    tier: "enterprise",
    priceId:
      process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY ||
      "price_placeholder_enterprise",
    productName: "EdgeProof Enterprise",
    amount: 49900, // cents
    interval: "month",
  },
  payPerUse: {
    tier: "free",
    priceId:
      process.env.STRIPE_PRICE_PAY_PER_USE || "price_placeholder_payperuse",
    productName: "EdgeProof Pay-Per-Use",
    amount: 500, // $5 per verification
    interval: "month",
  },
};

export function getPriceForTier(tier: SubscriptionTier): StripePriceMapping | null {
  if (tier === "free") return null;
  return Object.values(STRIPE_PRICES).find((p) => p.tier === tier) || null;
}
