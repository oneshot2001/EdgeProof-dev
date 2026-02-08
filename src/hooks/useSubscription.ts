"use client";

import { useState, useEffect } from "react";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  limits: (typeof TIER_LIMITS)[SubscriptionTier];
  isEnterprise: boolean;
  isPro: boolean;
  isFree: boolean;
  loading: boolean;
}

export function useSubscription(): UseSubscriptionReturn {
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTier = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("subscription_tier")
          .eq("id", user.id)
          .single();

        if (profile?.subscription_tier) {
          setTier(profile.subscription_tier as SubscriptionTier);
        }
      }
      setLoading(false);
    };

    fetchTier();
  }, []);

  return {
    tier,
    limits: TIER_LIMITS[tier],
    isEnterprise: tier === "enterprise",
    isPro: tier === "professional",
    isFree: tier === "free",
    loading,
  };
}
