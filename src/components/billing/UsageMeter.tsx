"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Clock } from "lucide-react";

interface UsageMeterProps {
  used: number;
  limit: number;
  label: string;
  resetAt?: string;
  isUnlimited?: boolean;
}

export function UsageMeter({
  used,
  limit,
  label,
  resetAt,
  isUnlimited = false,
}: UsageMeterProps) {
  const unlimited = isUnlimited || limit === Infinity || limit === 0;
  const percent = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const isWarning = !unlimited && percent > 80;
  const isAtLimit = !unlimited && used >= limit;

  // Calculate days until reset
  let resetLabel: string | null = null;
  if (resetAt) {
    const resetDate = new Date(resetAt);
    const now = new Date();
    const diffMs = resetDate.getTime() - now.getTime();
    const diffDays = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    if (diffDays === 0) {
      resetLabel = "Resets today";
    } else if (diffDays === 1) {
      resetLabel = "Resets tomorrow";
    } else {
      resetLabel = `Resets in ${diffDays} days`;
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <BarChart3 className="h-4 w-4" />
          {label}
        </CardTitle>
        <div className="flex items-center gap-2">
          {isAtLimit && <Badge variant="destructive">Limit reached</Badge>}
          {isWarning && !isAtLimit && (
            <Badge variant="secondary">Almost full</Badge>
          )}
          {unlimited && (
            <Badge variant="secondary">Unlimited</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold">{used}</span>
          <span className="text-sm text-muted-foreground">
            / {unlimited ? "Unlimited" : limit}
          </span>
        </div>

        {!unlimited && (
          <Progress
            value={percent}
            className={`h-2 ${isAtLimit ? "[&>div]:bg-destructive" : isWarning ? "[&>div]:bg-amber-500" : ""}`}
          />
        )}

        {unlimited && (
          <div className="h-2 w-full rounded-full bg-primary/10">
            <div className="h-full w-full rounded-full bg-primary/30" />
          </div>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {!unlimited && (
            <span>
              {Math.max(0, limit - used)} remaining
            </span>
          )}
          {unlimited && <span>No usage limit</span>}
          {resetLabel && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {resetLabel}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
