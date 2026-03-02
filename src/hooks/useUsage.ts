"use client";

import { useState, useEffect, useCallback } from "react";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface UseUsageReturn {
  monthlyCount: number;
  monthlyLimit: number;
  remaining: number;
  percentUsed: number;
  isAtLimit: boolean;
  isUnlimited: boolean;
  resetAt: string | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useUsage(tier: SubscriptionTier = "free"): UseUsageReturn {
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [resetAt, setResetAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUsage = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("monthly_verifications, monthly_reset_at")
        .eq("id", user.id)
        .single();

      if (profile) {
        setMonthlyCount(profile.monthly_verifications ?? 0);
        setResetAt(profile.monthly_reset_at ?? null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const load = async () => {
      await fetchUsage();
    };
    void load();
  }, [fetchUsage]);

  const monthlyLimit = TIER_LIMITS[tier].verificationsPerMonth;
  const isUnlimited = monthlyLimit === Infinity;
  const remaining = isUnlimited
    ? Infinity
    : Math.max(0, monthlyLimit - monthlyCount);
  const percentUsed = isUnlimited
    ? 0
    : (monthlyCount / monthlyLimit) * 100;
  const isAtLimit = !isUnlimited && monthlyCount >= monthlyLimit;

  return {
    monthlyCount,
    monthlyLimit,
    remaining,
    percentUsed,
    isAtLimit,
    isUnlimited,
    resetAt,
    loading,
    refresh: fetchUsage,
  };
}
