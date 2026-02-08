import { Link2, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { type AuditLogEntry } from "@/types/database";
import { format } from "date-fns";

interface ChainOfCustodyProps {
  auditLog: AuditLogEntry[];
  isEnterprise?: boolean;
}

const actionLabels: Record<string, string> = {
  uploaded: "File uploaded",
  verified: "Verification completed",
  viewed: "Result viewed",
  downloaded_pdf: "Certificate downloaded",
  downloaded_video: "Video downloaded",
  shared: "Result shared",
  exported_audit: "Audit log exported",
};

export function ChainOfCustody({
  auditLog,
  isEnterprise = false,
}: ChainOfCustodyProps) {
  if (!isEnterprise) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" />
            Chain of Custody
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <Lock className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Chain of Custody tracking is available on the Enterprise plan.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Chain of Custody
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {auditLog.map((entry) => (
            <div key={entry.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <div className="w-px flex-1 bg-border" />
              </div>
              <div className="pb-4 text-sm">
                <p className="font-medium">
                  {actionLabels[entry.action] || entry.action}
                </p>
                <p className="text-muted-foreground">
                  {format(new Date(entry.created_at), "PPpp")}
                </p>
                {entry.ip_address && (
                  <p className="text-xs text-muted-foreground">
                    IP: {entry.ip_address}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
