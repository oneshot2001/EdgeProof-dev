import { Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";

interface TemporalReportProps {
  recordingStart: string | null;
  recordingEnd: string | null;
  durationSeconds: number | null;
  gapsDetected: number;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function TemporalReport({
  recordingStart,
  recordingEnd,
  durationSeconds,
  gapsDetected,
}: TemporalReportProps) {
  if (!recordingStart) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Temporal Report
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No temporal data available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-4 w-4" />
          Temporal Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Recording Start</p>
            <p className="font-medium">
              {format(new Date(recordingStart), "PPpp")}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Recording End</p>
            <p className="font-medium">
              {recordingEnd
                ? format(new Date(recordingEnd), "PPpp")
                : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Duration</p>
            <p className="font-medium">
              {durationSeconds !== null ? formatDuration(durationSeconds) : "N/A"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Gaps Detected</p>
            <div className="flex items-center gap-2">
              <p className="font-medium">{gapsDetected}</p>
              {gapsDetected > 0 && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
