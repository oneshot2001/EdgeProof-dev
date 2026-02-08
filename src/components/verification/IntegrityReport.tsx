import { ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface IntegrityReportProps {
  totalGops: number | null;
  verifiedGops: number | null;
  tamperedGops: number | null;
  totalFrames: number | null;
  verifiedFrames: number | null;
  tamperedFrames: number | null;
}

export function IntegrityReport({
  totalGops,
  verifiedGops,
  tamperedGops,
  totalFrames,
  verifiedFrames,
  tamperedFrames,
}: IntegrityReportProps) {
  if (totalGops === null || totalGops === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4" />
            Integrity Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No integrity data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  const gopPercent = totalGops > 0 ? ((verifiedGops || 0) / totalGops) * 100 : 0;
  const framePercent =
    totalFrames && totalFrames > 0
      ? ((verifiedFrames || 0) / totalFrames) * 100
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4" />
          Integrity Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>GOP Verification</span>
            <span className="font-mono">
              {verifiedGops}/{totalGops} ({gopPercent.toFixed(1)}%)
            </span>
          </div>
          <Progress
            value={gopPercent}
            className="h-2"
          />
          {(tamperedGops || 0) > 0 && (
            <p className="mt-1 text-xs text-destructive">
              {tamperedGops} tampered GOPs detected
            </p>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>Frame Verification</span>
            <span className="font-mono">
              {verifiedFrames?.toLocaleString()}/{totalFrames?.toLocaleString()} (
              {framePercent.toFixed(1)}%)
            </span>
          </div>
          <Progress
            value={framePercent}
            className="h-2"
          />
          {(tamperedFrames || 0) > 0 && (
            <p className="mt-1 text-xs text-destructive">
              {tamperedFrames?.toLocaleString()} tampered frames detected
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-4 text-center text-sm">
          <div>
            <p className="text-2xl font-bold">{totalGops}</p>
            <p className="text-muted-foreground">Total GOPs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-600">{verifiedGops}</p>
            <p className="text-muted-foreground">Verified</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{tamperedGops}</p>
            <p className="text-muted-foreground">Tampered</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
