"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface UsageMeterProps {
  used: number;
  limit: number;
  label: string;
}

export function UsageMeter({ used, limit, label }: UsageMeterProps) {
  const isUnlimited = limit === Infinity;
  const percent = isUnlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = !isUnlimited && percent > 80;
  const isAtLimit = !isUnlimited && used >= limit;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {isAtLimit && <Badge variant="destructive">Limit reached</Badge>}
        {isWarning && !isAtLimit && (
          <Badge variant="secondary">Almost full</Badge>
        )}
      </CardHeader>
      <CardContent>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-2xl font-bold">{used}</span>
          <span className="text-sm text-muted-foreground">
            / {isUnlimited ? "Unlimited" : limit}
          </span>
        </div>
        {!isUnlimited && <Progress value={percent} className="h-2" />}
      </CardContent>
    </Card>
  );
}
