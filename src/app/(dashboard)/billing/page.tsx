"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingCards } from "@/components/billing/PricingCards";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { createClient } from "@/lib/supabase/client";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";

export default function BillingPage() {
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [monthlyUsed, setMonthlyUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBilling = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("subscription_tier, monthly_verifications")
          .eq("id", user.id)
          .single();

        if (profile) {
          setTier((profile.subscription_tier || "free") as SubscriptionTier);
          setMonthlyUsed(profile.monthly_verifications ?? 0);
        }
      }
      setLoading(false);
    };

    loadBilling();
  }, []);

  const limits = TIER_LIMITS[tier];
  const monthlyLimit = limits.verificationsPerMonth === Infinity ? 0 : limits.verificationsPerMonth;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription and usage
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{limits.label}</span>
              <Badge>Active</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {limits.price === 0
                ? "Free plan"
                : `$${limits.price}/month`}
            </p>
          </CardContent>
        </Card>

        <UsageMeter used={monthlyUsed} limit={monthlyLimit} label="Monthly Verifications" />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Available Plans</h2>
        <PricingCards />
      </div>
    </div>
  );
}
