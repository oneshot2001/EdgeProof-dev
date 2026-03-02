import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentVerifications } from "@/components/dashboard/RecentVerifications";
import { UsageChart } from "@/components/dashboard/UsageChart";
import { createClient } from "@/lib/supabase/server";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch user profile
  const { data: userProfile } = await supabase
    .from("users")
    .select("full_name, subscription_tier, monthly_verifications")
    .eq("id", user!.id)
    .single();

  const displayName = userProfile?.full_name || user?.user_metadata?.full_name || user?.email || "there";
  const tier = (userProfile?.subscription_tier || "free") as SubscriptionTier;
  const limits = TIER_LIMITS[tier];
  const monthlyUsed = userProfile?.monthly_verifications ?? 0;

  // Fetch recent verifications
  const { data: verifications } = await supabase
    .from("verifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);

  const allVerifications = verifications || [];

  const authenticCount = allVerifications.filter(
    (v) => v.status === "authentic"
  ).length;
  const tamperedCount = allVerifications.filter(
    (v) => v.status === "tampered"
  ).length;
  const pendingCount = allVerifications.filter(
    (v) => v.status === "processing" || v.status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {displayName}. Here&apos;s your verification overview.
          </p>
        </div>
        <Button asChild>
          <Link href="/verify">
            <Upload className="mr-2 h-4 w-4" />
            Verify Video
          </Link>
        </Button>
      </div>

      <StatsCards
        totalVerifications={allVerifications.length}
        authenticCount={authenticCount}
        tamperedCount={tamperedCount}
        pendingCount={pendingCount}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentVerifications verifications={allVerifications.slice(0, 5)} />
        </div>
        <UsageChart
          used={monthlyUsed}
          limit={limits.verificationsPerMonth}
          tierLabel={limits.label}
        />
      </div>
    </div>
  );
}
