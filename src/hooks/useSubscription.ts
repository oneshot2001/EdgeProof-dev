"use client";

import { useState, useEffect, useCallback } from "react";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

interface UseSubscriptionReturn {
  tier: SubscriptionTier;
  limits: (typeof TIER_LIMITS)[SubscriptionTier];
  isEnterprise: boolean;
  isPro: boolean;
  isFree: boolean;
  loading: boolean;
  stripeCustomerId: string | null;
  refresh: () => Promise<void>;
}

export function useSubscription(): UseSubscriptionReturn {
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTier = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("subscription_tier, stripe_customer_id")
        .eq("id", user.id)
        .single();

      if (profile?.subscription_tier) {
        setTier(profile.subscription_tier as SubscriptionTier);
      }
      if (profile?.stripe_customer_id) {
        setStripeCustomerId(profile.stripe_customer_id);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchTier();
  }, [fetchTier]);

  return {
    tier,
    limits: TIER_LIMITS[tier],
    isEnterprise: tier === "enterprise",
    isPro: tier === "professional",
    isFree: tier === "free",
    loading,
    stripeCustomerId,
    refresh: fetchTier,
  };
}
