"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { PricingCards } from "@/components/billing/PricingCards";
import { UsageMeter } from "@/components/billing/UsageMeter";
import { type BillingSubscriptionResponse } from "@/types/billing";
import { type SubscriptionTier } from "@/lib/constants";
import {
  CreditCard,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Shield,
} from "lucide-react";
import { toast } from "sonner";

function BillingContent() {
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<BillingSubscriptionResponse | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const res = await fetch("/api/billing/subscription");
      if (!res.ok) throw new Error("Failed to fetch billing data");
      const data: BillingSubscriptionResponse = await res.json();
      setBilling(data);
    } catch (err) {
      console.error("Failed to load billing:", err);
      toast.error("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  // Handle checkout return params
  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success("Subscription activated successfully! Welcome to your new plan.");
      // Re-fetch billing data to reflect new subscription
      fetchBilling();
      // Clean URL without triggering navigation
      window.history.replaceState({}, "", "/billing");
    } else if (canceled === "true") {
      toast.info("Checkout was canceled. No changes were made to your subscription.");
      window.history.replaceState({}, "", "/billing");
    }
  }, [searchParams, fetchBilling]);

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to open billing portal");
      }
    } catch {
      toast.error("Failed to open billing portal");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return <BillingPageSkeleton />;
  }

  if (!billing) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="text-muted-foreground">
            Unable to load billing information. Please try refreshing the page.
          </p>
        </div>
      </div>
    );
  }

  const tier = billing.tier;
  const isFree = tier === "free";
  const isEnterprise = tier === "enterprise";
  const monthlyLimit = billing.usage.monthlyLimit ?? 0;
  const subscription = billing.subscription;
  const isCanceling = subscription?.cancelAtPeriodEnd === true;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription, usage, and payment details
        </p>
      </div>

      {/* Cancellation warning banner */}
      {isCanceling && subscription && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 pt-6">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">
                Your subscription is scheduled to cancel
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your {billing.limits.label} plan will remain active until{" "}
                {subscription.currentPeriodEnd
                  ? new Date(
                      subscription.currentPeriodEnd * 1000
                    ).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "the end of your billing period"}
                . After that, you will be downgraded to the Free plan.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={handleManageSubscription}
                disabled={portalLoading}
              >
                {portalLoading ? "Loading..." : "Reactivate Subscription"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Plan + Usage */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Current Plan
            </CardTitle>
            <CardDescription>
              {isFree
                ? "You are on the free plan"
                : `Billed monthly at $${billing.limits.price}/month`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-bold">{billing.limits.label}</span>
              {isCanceling ? (
                <Badge variant="secondary">Canceling</Badge>
              ) : (
                <Badge
                  variant={isFree ? "secondary" : "default"}
                >
                  Active
                </Badge>
              )}
            </div>

            {!isFree && subscription && (
              <div className="space-y-2 text-sm text-muted-foreground">
                {subscription.currentPeriodEnd && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {isCanceling ? "Access until" : "Next billing date"}:{" "}
                      {new Date(
                        subscription.currentPeriodEnd * 1000
                      ).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Plan features summary */}
            <Separator />
            <div className="space-y-1.5 text-sm">
              <PlanFeature
                label="Max file size"
                value={billing.limits.maxFileSizeLabel}
              />
              <PlanFeature
                label="Monthly verifications"
                value={
                  billing.limits.verificationsPerMonth === null
                    ? "Unlimited"
                    : String(billing.limits.verificationsPerMonth)
                }
              />
              {isEnterprise && (
                <>
                  <PlanFeature label="API access" value="Included" />
                  <PlanFeature label="Team members" value="Up to 25" />
                  <PlanFeature label="Chain of custody" value="Included" />
                </>
              )}
            </div>

            {/* Manage / Portal button */}
            {!isFree && billing.stripeCustomerId && (
              <>
                <Separator />
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleManageSubscription}
                  disabled={portalLoading}
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {portalLoading
                    ? "Loading..."
                    : "Manage Subscription & Payment"}
                  <ExternalLink className="ml-auto h-4 w-4" />
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <UsageMeter
          used={billing.usage.monthlyVerifications}
          limit={monthlyLimit}
          label="Monthly Verifications"
          resetAt={billing.usage.resetAt}
          isUnlimited={billing.usage.monthlyLimit === null}
        />
      </div>

      {/* Plans section */}
      <div>
        <div className="mb-6">
          <h2 className="text-lg font-semibold">
            {isFree ? "Upgrade Your Plan" : "Change Plan"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {isFree
              ? "Unlock more verifications, larger files, and advanced features"
              : "Switch between plans or manage your current subscription"}
          </p>
        </div>
        <PricingCards
          currentTier={tier}
          hasStripeCustomer={!!billing.stripeCustomerId}
          onManageSubscription={handleManageSubscription}
        />
      </div>
    </div>
  );
}

function PlanFeature({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function BillingPageSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription, usage, and payment details
        </p>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-2 w-full" />
          </CardContent>
        </Card>
      </div>
      <div>
        <Skeleton className="mb-6 h-6 w-40" />
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingPageSkeleton />}>
      <BillingContent />
    </Suspense>
  );
}
