import Link from "next/link";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentVerifications } from "@/components/dashboard/RecentVerifications";
import { UsageChart } from "@/components/dashboard/UsageChart";
import { MOCK_VERIFICATIONS } from "@/lib/mock/data";

export default function DashboardPage() {
  const verifications = MOCK_VERIFICATIONS;
  const authenticCount = verifications.filter(
    (v) => v.status === "authentic"
  ).length;
  const tamperedCount = verifications.filter(
    (v) => v.status === "tampered"
  ).length;
  const pendingCount = verifications.filter(
    (v) => v.status === "processing" || v.status === "pending"
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, Sarah. Here&apos;s your verification overview.
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
        totalVerifications={verifications.length}
        authenticCount={authenticCount}
        tamperedCount={tamperedCount}
        pendingCount={pendingCount}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentVerifications verifications={verifications.slice(0, 5)} />
        </div>
        <UsageChart used={7} limit={100} tierLabel="Professional" />
      </div>
    </div>
  );
}
