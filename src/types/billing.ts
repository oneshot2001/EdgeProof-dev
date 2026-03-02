import { type SubscriptionTier } from "@/lib/constants";

export interface SubscriptionDetails {
  id: string;
  status: string;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
}

export interface BillingLimits {
  label: string;
  price: number;
  verificationsPerMonth: number | null;
  maxFileSizeLabel: string;
}

export interface BillingUsage {
  monthlyVerifications: number;
  monthlyLimit: number | null;
  resetAt: string;
}

export interface BillingSubscriptionResponse {
  tier: SubscriptionTier;
  limits: BillingLimits;
  usage: BillingUsage;
  stripeCustomerId: string | null;
  subscription: SubscriptionDetails | null;
}
