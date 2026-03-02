import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select(
      "subscription_tier, stripe_customer_id, monthly_verifications, monthly_reset_at"
    )
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: "User profile not found" },
      { status: 404 }
    );
  }

  const tier = (profile.subscription_tier || "free") as SubscriptionTier;
  const limits = TIER_LIMITS[tier];

  // Base response without Stripe details
  const response: Record<string, unknown> = {
    tier,
    limits: {
      label: limits.label,
      price: limits.price,
      verificationsPerMonth: limits.verificationsPerMonth === Infinity ? null : limits.verificationsPerMonth,
      maxFileSizeLabel: limits.maxFileSizeLabel,
    },
    usage: {
      monthlyVerifications: profile.monthly_verifications ?? 0,
      monthlyLimit: limits.verificationsPerMonth === Infinity ? null : limits.verificationsPerMonth,
      resetAt: profile.monthly_reset_at,
    },
    stripeCustomerId: profile.stripe_customer_id,
    subscription: null,
  };

  // Fetch active Stripe subscription details if customer exists
  const stripe = getStripe();
  if (stripe && profile.stripe_customer_id) {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripe_customer_id,
        status: "active",
        limit: 1,
      });

      const activeSub = subscriptions.data[0];
      if (activeSub) {
        const firstItem = activeSub.items.data[0];
        response.subscription = {
          id: activeSub.id,
          status: activeSub.status,
          currentPeriodStart: firstItem?.current_period_start ?? null,
          currentPeriodEnd: firstItem?.current_period_end ?? null,
          cancelAtPeriodEnd: activeSub.cancel_at_period_end,
          cancelAt: activeSub.cancel_at,
        };
      }
    } catch (err) {
      console.error("Failed to fetch Stripe subscription:", err);
      // Non-fatal: return response without subscription details
    }
  }

  return NextResponse.json(response);
}
