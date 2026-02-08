import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { VerdictBadge } from "@/components/verification/VerdictBadge";
import { MOCK_VERIFICATIONS } from "@/lib/mock/data";
import { formatDistanceToNow } from "date-fns";

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export default function VerificationsPage() {
  const verifications = MOCK_VERIFICATIONS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Verification History</h1>
        <p className="text-muted-foreground">
          All your video verification records
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {verifications.map((v) => (
              <TableRow key={v.id}>
                <TableCell>
                  <Link
                    href={`/verifications/${v.id}`}
                    className="font-medium hover:underline"
                  >
                    {v.file_name}
                  </Link>
                </TableCell>
                <TableCell>
                  <VerdictBadge status={v.status} size="sm" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {v.device_model || "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatFileSize(v.file_size_bytes)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(v.created_at), {
                    addSuffix: true,
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
