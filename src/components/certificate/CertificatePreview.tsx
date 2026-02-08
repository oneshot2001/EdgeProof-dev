import { Shield, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type CertificateData } from "@/types/api";
import { format } from "date-fns";

interface CertificatePreviewProps {
  data: CertificateData;
}

export function CertificatePreview({ data }: CertificatePreviewProps) {
  const isAuthentic = data.status === "authentic";
  const isTampered = data.status === "tampered";

  const StatusIcon = isAuthentic
    ? CheckCircle
    : isTampered
      ? XCircle
      : AlertTriangle;

  const statusColor = isAuthentic
    ? "text-emerald-600"
    : isTampered
      ? "text-red-600"
      : "text-amber-600";

  const statusLabel = isAuthentic
    ? "VERIFIED AUTHENTIC"
    : isTampered
      ? "TAMPERING DETECTED"
      : "UNSIGNED VIDEO";

  return (
    <Card className="overflow-hidden">
      <div className="bg-primary px-6 py-4">
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="font-bold">EdgeProof</span>
          </div>
          <span className="text-xs opacity-80">
            ID: {data.verificationId.slice(0, 8)}
          </span>
        </div>
        <h2 className="mt-2 text-center text-lg font-bold text-primary-foreground">
          Certificate of Video Authenticity
        </h2>
      </div>

      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col items-center gap-2 py-4">
          <StatusIcon className={`h-16 w-16 ${statusColor}`} />
          <h3 className={`text-xl font-bold ${statusColor}`}>{statusLabel}</h3>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <h4 className="mb-2 font-semibold">File Information</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">File</span>
              <span className="font-mono text-xs">{data.fileName}</span>
              <span className="text-muted-foreground">SHA-256</span>
              <span className="font-mono text-xs truncate">{data.fileHash}</span>
            </div>
          </div>

          {data.device.serial && (
            <div>
              <h4 className="mb-2 font-semibold">Device Origin</h4>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Serial</span>
                <span className="font-mono">{data.device.serial}</span>
                <span className="text-muted-foreground">Model</span>
                <span>{data.device.model}</span>
                <span className="text-muted-foreground">Certificate Chain</span>
                <Badge variant={data.certificateChain.valid ? "default" : "destructive"}>
                  {data.certificateChain.valid ? "Valid" : "Invalid"}
                </Badge>
              </div>
            </div>
          )}

          {data.integrity.totalGops !== null && data.integrity.totalGops > 0 && (
            <div>
              <h4 className="mb-2 font-semibold">Integrity</h4>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">GOPs Verified</span>
                <span>
                  {data.integrity.verifiedGops}/{data.integrity.totalGops}
                </span>
                <span className="text-muted-foreground">Frames Verified</span>
                <span>
                  {data.integrity.verifiedFrames?.toLocaleString()}/
                  {data.integrity.totalFrames?.toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {data.temporal.recordingStart && (
            <div>
              <h4 className="mb-2 font-semibold">Temporal</h4>
              <div className="grid grid-cols-2 gap-2">
                <span className="text-muted-foreground">Start</span>
                <span>
                  {format(new Date(data.temporal.recordingStart), "PPpp")}
                </span>
                <span className="text-muted-foreground">End</span>
                <span>
                  {data.temporal.recordingEnd
                    ? format(new Date(data.temporal.recordingEnd), "PPpp")
                    : "N/A"}
                </span>
                <span className="text-muted-foreground">Gaps</span>
                <span>{data.temporal.gapsDetected}</span>
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4 text-center text-xs text-muted-foreground">
          <p>Issued: {format(new Date(data.issuedAt), "PPpp")}</p>
          {data.publicToken && (
            <p className="mt-1">
              Verify: {process.env.NEXT_PUBLIC_APP_URL || "https://edgeproof.com"}/verify/{data.publicToken}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
