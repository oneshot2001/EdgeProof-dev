"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PricingCards } from "@/components/billing/PricingCards";
import { UsageMeter } from "@/components/billing/UsageMeter";

export default function BillingPage() {
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
              <span className="text-2xl font-bold">Professional</span>
              <Badge>Active</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              $99/month &middot; Next billing date: March 1, 2026
            </p>
          </CardContent>
        </Card>

        <UsageMeter used={7} limit={100} label="Monthly Verifications" />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold">Available Plans</h2>
        <PricingCards />
      </div>
    </div>
  );
}
