"use client";

import { useState } from "react";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  limits: (typeof TIER_LIMITS)[SubscriptionTier];
  isEnterprise: boolean;
  isPro: boolean;
  isFree: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
  // In production, this would fetch from Supabase via the user's profile
  // For dev, use a mock "professional" tier
  const [tier] = useState<SubscriptionTier>("professional");

  return {
    tier,
    limits: TIER_LIMITS[tier],
    isEnterprise: tier === "enterprise",
    isPro: tier === "professional",
    isFree: tier === "free",
  };
}
