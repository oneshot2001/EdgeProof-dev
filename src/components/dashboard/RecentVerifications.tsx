import Link from "next/link";
import { FileVideo } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerdictBadge } from "@/components/verification/VerdictBadge";
import { type Verification } from "@/types/database";
import { formatDistanceToNow } from "date-fns";

interface RecentVerificationsProps {
  verifications: Verification[];
}

export function RecentVerifications({ verifications }: RecentVerificationsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Verifications</CardTitle>
      </CardHeader>
      <CardContent>
        {verifications.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No verifications yet. Upload a video to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {verifications.map((v) => (
              <Link
                key={v.id}
                href={`/verifications/${v.id}`}
                className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <FileVideo className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-medium">{v.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(v.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                <VerdictBadge status={v.status} size="sm" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
