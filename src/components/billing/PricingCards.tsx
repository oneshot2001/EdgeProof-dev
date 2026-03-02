"use client";

import { useState } from "react";
import { Check, X, ArrowUp, ArrowDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { type SubscriptionTier } from "@/lib/constants";
import { toast } from "sonner";

const TIER_ORDER: Record<string, number> = {
  free: 0,
  professional: 1,
  enterprise: 2,
};

const plans = [
  {
    key: "free" as const,
    name: "Free",
    price: "$0",
    period: "/month",
    description: "Get started with video verification",
    features: [
      { label: "3 verifications/month", included: true },
      { label: "2 GB max file size", included: true },
      { label: "Basic certificate", included: true },
      { label: "30-day archive", included: true },
      { label: "Chain of Custody", included: false },
      { label: "API access", included: false },
      { label: "Team members", included: false },
    ],
    highlight: false,
    checkoutPlan: null,
  },
  {
    key: "professional" as const,
    name: "Professional",
    price: "$99",
    period: "/month",
    description: "For legal professionals and investigators",
    features: [
      { label: "100 verifications/month", included: true },
      { label: "10 GB max file size", included: true },
      { label: "Branded certificate", included: true },
      { label: "1-year archive", included: true },
      { label: "Batch upload (10 files)", included: true },
      { label: "Priority processing", included: true },
      { label: "Chain of Custody", included: false },
      { label: "API access", included: false },
    ],
    highlight: true,
    checkoutPlan: "pro",
  },
  {
    key: "enterprise" as const,
    name: "Enterprise",
    price: "$499",
    period: "/month",
    description: "For law firms and large organizations",
    features: [
      { label: "Unlimited verifications", included: true },
      { label: "50 GB max file size", included: true },
      { label: "White-label certificate", included: true },
      { label: "Unlimited archive", included: true },
      { label: "Batch upload (100 files)", included: true },
      { label: "Chain of Custody", included: true },
      { label: "API access", included: true },
      { label: "Up to 25 team members", included: true },
      { label: "SSO (SAML/OIDC)", included: true },
      { label: "Expert witness template", included: true },
    ],
    highlight: false,
    checkoutPlan: "enterprise",
  },
];

interface PricingCardsProps {
  currentTier?: SubscriptionTier;
  hasStripeCustomer?: boolean;
  onManageSubscription?: () => void;
}

export function PricingCards({
  currentTier = "free",
  hasStripeCustomer = false,
  onManageSubscription,
}: PricingCardsProps) {
  const [loading, setLoading] = useState<string | null>(null);

  const currentOrder = TIER_ORDER[currentTier] ?? 0;

  async function handleCheckout(plan: string) {
    setLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to start checkout");
        setLoading(null);
      }
    } catch {
      toast.error("Failed to start checkout. Please try again.");
      setLoading(null);
    }
  }

  function getCtaForPlan(plan: (typeof plans)[number]) {
    const isCurrent = plan.key === currentTier;
    const planOrder = TIER_ORDER[plan.key] ?? 0;
    const isUpgrade = planOrder > currentOrder;
    const isDowngrade = planOrder < currentOrder;

    if (isCurrent) {
      return {
        text: "Current Plan",
        icon: <Check className="mr-2 h-4 w-4" />,
        disabled: true,
        action: () => {},
        variant: "outline" as const,
      };
    }

    if (isDowngrade) {
      // Downgrades go through the Stripe portal
      if (plan.key === "free") {
        return {
          text: "Downgrade to Free",
          icon: <ArrowDown className="mr-2 h-4 w-4" />,
          disabled: !hasStripeCustomer || loading !== null,
          action: () => {
            if (onManageSubscription) {
              onManageSubscription();
            }
          },
          variant: "outline" as const,
        };
      }
      return {
        text: `Downgrade to ${plan.name}`,
        icon: <ArrowDown className="mr-2 h-4 w-4" />,
        disabled: !hasStripeCustomer || loading !== null,
        action: () => {
          if (onManageSubscription) {
            onManageSubscription();
          }
        },
        variant: "outline" as const,
      };
    }

    if (isUpgrade) {
      // If user already has a Stripe customer (existing paid subscription),
      // upgrades also go through the portal for proration
      if (hasStripeCustomer && currentTier !== "free") {
        return {
          text: `Upgrade to ${plan.name}`,
          icon: <ArrowUp className="mr-2 h-4 w-4" />,
          disabled: loading !== null,
          action: () => {
            if (onManageSubscription) {
              onManageSubscription();
            }
          },
          variant: "default" as const,
        };
      }

      // New checkout for free users upgrading
      return {
        text: `Upgrade to ${plan.name}`,
        icon: <ArrowUp className="mr-2 h-4 w-4" />,
        disabled: loading !== null,
        action: () => plan.checkoutPlan && handleCheckout(plan.checkoutPlan),
        variant: "default" as const,
      };
    }

    return {
      text: plan.checkoutPlan ? `Get ${plan.name}` : "Free Tier",
      icon: null,
      disabled: loading !== null,
      action: () => plan.checkoutPlan && handleCheckout(plan.checkoutPlan),
      variant: "outline" as const,
    };
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => {
        const isCurrent = plan.key === currentTier;
        const cta = getCtaForPlan(plan);

        return (
          <Card
            key={plan.name}
            className={cn(
              "relative flex flex-col",
              plan.highlight &&
                !isCurrent &&
                "border-primary shadow-lg",
              isCurrent && "border-emerald-500 bg-emerald-500/5 shadow-md"
            )}
          >
            {plan.highlight && !isCurrent && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most Popular
              </Badge>
            )}
            {isCurrent && (
              <Badge
                variant="secondary"
                className="absolute -top-3 left-1/2 -translate-x-1/2 border-emerald-500 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
              >
                Your Plan
              </Badge>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.price}</span>
                <span className="text-muted-foreground">{plan.period}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {plan.description}
              </p>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature) => (
                  <li
                    key={feature.label}
                    className="flex items-center gap-2 text-sm"
                  >
                    {feature.included ? (
                      <Check className="h-4 w-4 shrink-0 text-emerald-600" />
                    ) : (
                      <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                    )}
                    <span
                      className={cn(
                        !feature.included && "text-muted-foreground"
                      )}
                    >
                      {feature.label}
                    </span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full"
                variant={cta.variant}
                disabled={cta.disabled}
                onClick={cta.action}
              >
                {loading === plan.checkoutPlan ? (
                  "Redirecting..."
                ) : (
                  <>
                    {cta.icon}
                    {cta.text}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
