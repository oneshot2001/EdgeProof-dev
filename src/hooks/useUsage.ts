"use client";

import { useState, useEffect } from "react";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface UseUsageReturn {
  monthlyCount: number;
  monthlyLimit: number;
  remaining: number;
  percentUsed: number;
  isAtLimit: boolean;
  loading: boolean;
}

export function useUsage(tier: SubscriptionTier = "free"): UseUsageReturn {
  const [monthlyCount, setMonthlyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("monthly_verifications")
          .eq("id", user.id)
          .single();

        if (profile) {
          setMonthlyCount(profile.monthly_verifications ?? 0);
        }
      }
      setLoading(false);
    };

    fetchUsage();
  }, []);

  const monthlyLimit = TIER_LIMITS[tier].verificationsPerMonth;
  const remaining = Math.max(0, monthlyLimit - monthlyCount);
  const percentUsed = monthlyLimit === Infinity ? 0 : (monthlyCount / monthlyLimit) * 100;
  const isAtLimit = monthlyLimit !== Infinity && monthlyCount >= monthlyLimit;

  return { monthlyCount, monthlyLimit, remaining, percentUsed, isAtLimit, loading };
}
