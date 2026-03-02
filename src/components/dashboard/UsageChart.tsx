"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface UsageChartProps {
  used: number;
  limit: number;
  tierLabel: string;
}

export function UsageChart({ used, limit, tierLabel }: UsageChartProps) {
  const isUnlimited = limit === Infinity;
  const percent = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold">{used}</span>
          <span className="text-sm text-muted-foreground">
            / {isUnlimited ? "Unlimited" : limit} verifications
          </span>
        </div>

        {!isUnlimited && <Progress value={percent} className="h-3" />}

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{tierLabel} Plan</span>
          {!isUnlimited && (
            <span className="text-muted-foreground">
              {remaining} remaining
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
