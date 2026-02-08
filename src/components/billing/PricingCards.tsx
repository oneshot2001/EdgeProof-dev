"use client";

import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const plans = [
  {
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
    cta: "Current Plan",
    highlight: false,
  },
  {
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
    cta: "Upgrade to Pro",
    highlight: true,
  },
  {
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
    cta: "Contact Sales",
    highlight: false,
  },
];

export function PricingCards() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((plan) => (
        <Card
          key={plan.name}
          className={cn(
            "relative",
            plan.highlight && "border-primary shadow-lg"
          )}
        >
          {plan.highlight && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
              Most Popular
            </Badge>
          )}
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <div className="mt-2">
              <span className="text-3xl font-bold">{plan.price}</span>
              <span className="text-muted-foreground">{plan.period}</span>
            </div>
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {plan.features.map((feature) => (
                <li key={feature.label} className="flex items-center gap-2 text-sm">
                  {feature.included ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <X className="h-4 w-4 text-muted-foreground/40" />
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
              variant={plan.highlight ? "default" : "outline"}
            >
              {plan.cta}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
