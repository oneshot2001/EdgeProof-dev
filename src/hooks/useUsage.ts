"use client";

import { useState } from "react";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";

interface UseUsageReturn {
  monthlyCount: number;
  monthlyLimit: number;
  remaining: number;
  percentUsed: number;
  isAtLimit: boolean;
}

export function useUsage(tier: SubscriptionTier = "professional"): UseUsageReturn {
  // In production, fetch from Supabase user profile
  const [monthlyCount] = useState(7);
  const monthlyLimit = TIER_LIMITS[tier].verificationsPerMonth;
  const remaining = Math.max(0, monthlyLimit - monthlyCount);
  const percentUsed = monthlyLimit === Infinity ? 0 : (monthlyCount / monthlyLimit) * 100;
  const isAtLimit = monthlyLimit !== Infinity && monthlyCount >= monthlyLimit;

  return { monthlyCount, monthlyLimit, remaining, percentUsed, isAtLimit };
}
