"use client";

import {
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  HelpCircle,
  FileText,
  Cpu,
  BarChart3,
  Clock,
  ScrollText,
  Scale,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type CertificateData } from "@/types/api";
import { format } from "date-fns";
import { formatDuration, formatFileSize } from "@/lib/pdf/certificate";

interface CertificatePreviewProps {
  data: CertificateData;
}

function getStatusConfig(status: CertificateData["status"]) {
  switch (status) {
    case "authentic":
      return {
        icon: CheckCircle,
        color: "text-emerald-600",
        bg: "bg-emerald-50",
        border: "border-emerald-200",
        label: "VERIFIED AUTHENTIC",
        description:
          "Cryptographic analysis confirms this video has not been altered since recording.",
      };
    case "tampered":
      return {
        icon: XCircle,
        color: "text-red-600",
        bg: "bg-red-50",
        border: "border-red-200",
        label: "TAMPERING DETECTED",
        description:
          "Modifications detected after the video was originally recorded.",
      };
    case "unsigned":
      return {
        icon: AlertTriangle,
        color: "text-amber-600",
        bg: "bg-amber-50",
        border: "border-amber-200",
        label: "UNSIGNED VIDEO",
        description:
          "This video does not contain cryptographic signatures.",
      };
    case "inconclusive":
      return {
        icon: HelpCircle,
        color: "text-blue-600",
        bg: "bg-blue-50",
        border: "border-blue-200",
        label: "INCONCLUSIVE",
        description:
          "Verification could not reach a definitive conclusion.",
      };
    default:
      return {
        icon: AlertTriangle,
        color: "text-gray-600",
        bg: "bg-gray-50",
        border: "border-gray-200",
        label: "ERROR",
        description: "An error occurred during verification.",
      };
  }
}

function formatAuditAction(action: string): string {
  const map: Record<string, string> = {
    uploaded: "File Uploaded",
    verified: "Verification Completed",
    viewed: "Certificate Viewed",
    downloaded_pdf: "PDF Downloaded",
    downloaded_video: "Video Downloaded",
    shared: "Certificate Shared",
    exported_audit: "Audit Log Exported",
  };
  return map[action] || action;
}

function SectionHeader({
  icon: Icon,
  title,
  number,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  number: number;
}) {
  return (
    <div className="flex items-center gap-2 border-b pb-2 mb-3">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
        {number}
      </div>
      <Icon className="h-4 w-4 text-muted-foreground" />
      <h4 className="font-semibold">{title}</h4>
    </div>
  );
}

function DataRow({
  label,
  value,
  mono,
  good,
  bad,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
  good?: boolean;
  bad?: boolean;
}) {
  const displayValue =
    value === null || value === undefined ? "N/A" : String(value);

  let valueClass = "font-medium";
  if (mono) valueClass = "font-mono text-xs";
  if (good) valueClass += " text-emerald-600";
  if (bad) valueClass += " text-red-600";

  return (
    <div className="grid grid-cols-[38%_62%] gap-1 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClass}>{displayValue}</span>
    </div>
  );
}

export function CertificatePreview({ data }: CertificatePreviewProps) {
  const status = getStatusConfig(data.status);
  const StatusIcon = status.icon;

  const hasDevice = Boolean(data.device.serial || data.device.model);
  const hasIntegrity =
    data.integrity.totalGops !== null && data.integrity.totalGops > 0;
  const hasTemporal = Boolean(data.temporal.recordingStart);
  const hasAuditLog = data.auditLog.length > 0;

  let sectionNum = 0;
  const nextSection = () => ++sectionNum;

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-primary px-6 py-4">
        <div className="flex items-center justify-between text-primary-foreground">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <span className="text-lg font-bold tracking-wide">EDGEPROOF</span>
          </div>
          <span className="font-mono text-xs opacity-80">
            {data.verificationId.slice(0, 8)}...
          </span>
        </div>
        <h2 className="mt-2 text-center text-lg font-bold text-primary-foreground">
          Certificate of Video Authenticity
        </h2>
      </div>

      <CardContent className="space-y-6 p-6">
        {/* Meta row */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <div>
            <span className="uppercase tracking-wide">Issued: </span>
            <span className="font-medium text-foreground">
              {format(new Date(data.issuedAt), "PPP")}
            </span>
          </div>
          <div>
            <span className="uppercase tracking-wide">Verified: </span>
            <span className="font-medium text-foreground">
              {data.verifiedAt
                ? format(new Date(data.verifiedAt), "PPpp")
                : "Pending"}
            </span>
          </div>
        </div>

        {/* Verdict */}
        <div
          className={`flex flex-col items-center gap-2 rounded-lg border-2 ${status.border} ${status.bg} py-6`}
        >
          <StatusIcon className={`h-16 w-16 ${status.color}`} />
          <h3 className={`text-xl font-bold tracking-widest ${status.color}`}>
            {status.label}
          </h3>
          <p className="max-w-md text-center text-sm text-muted-foreground">
            {status.description}
          </p>
        </div>

        {/* File Information */}
        <div className="text-sm">
          <SectionHeader
            icon={FileText}
            title="File Information"
            number={nextSection()}
          />
          <DataRow label="File Name" value={data.fileName} />
          <DataRow
            label="File Size"
            value={
              data.fileSizeBytes ? formatFileSize(data.fileSizeBytes) : null
            }
          />
          <DataRow label="SHA-256 Hash" value={data.fileHash} mono />
        </div>

        {/* Device Origin */}
        {hasDevice && (
          <div className="text-sm">
            <SectionHeader
              icon={Cpu}
              title="Device Origin"
              number={nextSection()}
            />
            <DataRow label="Serial Number" value={data.device.serial} mono />
            <DataRow label="Camera Model" value={data.device.model} />
            <DataRow label="Firmware" value={data.device.firmware} />
            {data.device.hardwareId && (
              <DataRow label="Hardware ID" value={data.device.hardwareId} mono />
            )}
            <DataRow
              label="Certificate Chain"
              value={
                data.certificateChain.valid === null
                  ? "N/A"
                  : data.certificateChain.valid
                    ? "Valid - Trusted"
                    : "Invalid - Untrusted"
              }
              good={data.certificateChain.valid === true}
              bad={data.certificateChain.valid === false}
            />
            {data.attestation.valid !== null && (
              <DataRow
                label="Key Attestation"
                value={
                  data.attestation.valid
                    ? "Valid - TPM Bound"
                    : "Invalid or Absent"
                }
                good={data.attestation.valid === true}
                bad={data.attestation.valid === false}
              />
            )}
          </div>
        )}

        {/* Integrity */}
        {hasIntegrity && (
          <div className="text-sm">
            <SectionHeader
              icon={BarChart3}
              title="Integrity Analysis"
              number={nextSection()}
            />
            <DataRow
              label="Total GOPs"
              value={data.integrity.totalGops}
            />
            <DataRow
              label="Verified GOPs"
              value={data.integrity.verifiedGops}
              good={
                data.integrity.verifiedGops === data.integrity.totalGops
              }
            />
            <DataRow
              label="Tampered GOPs"
              value={data.integrity.tamperedGops}
              bad={(data.integrity.tamperedGops ?? 0) > 0}
            />
            <DataRow
              label="Total Frames"
              value={data.integrity.totalFrames?.toLocaleString()}
            />
            <DataRow
              label="Verified Frames"
              value={data.integrity.verifiedFrames?.toLocaleString()}
              good={
                data.integrity.verifiedFrames === data.integrity.totalFrames
              }
            />
            <DataRow
              label="GOP Chain Continuity"
              value={
                data.integrity.chainIntact === null
                  ? "N/A"
                  : data.integrity.chainIntact
                    ? "Intact"
                    : "Broken"
              }
              good={data.integrity.chainIntact === true}
              bad={data.integrity.chainIntact === false}
            />
            <DataRow
              label="Hash Algorithm"
              value={data.integrity.hashAlgorithm}
            />

            {/* Visual bar */}
            {data.integrity.totalGops !== null &&
              data.integrity.verifiedGops !== null &&
              data.integrity.tamperedGops !== null &&
              data.integrity.totalGops > 0 && (
                <div className="mt-2">
                  <div className="flex h-2 overflow-hidden rounded-full">
                    <div
                      className="bg-emerald-500"
                      style={{
                        width: `${(data.integrity.verifiedGops / data.integrity.totalGops) * 100}%`,
                      }}
                    />
                    <div
                      className="bg-red-500"
                      style={{
                        width: `${(data.integrity.tamperedGops / data.integrity.totalGops) * 100}%`,
                      }}
                    />
                    <div className="flex-1 bg-gray-200" />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {(
                      (data.integrity.verifiedGops /
                        data.integrity.totalGops) *
                      100
                    ).toFixed(1)}
                    % verified
                    {data.integrity.tamperedGops > 0 &&
                      ` | ${((data.integrity.tamperedGops / data.integrity.totalGops) * 100).toFixed(1)}% tampered`}
                  </p>
                </div>
              )}
          </div>
        )}

        {/* Temporal */}
        {hasTemporal && (
          <div className="text-sm">
            <SectionHeader
              icon={Clock}
              title="Temporal Analysis"
              number={nextSection()}
            />
            <DataRow
              label="Recording Start"
              value={
                data.temporal.recordingStart
                  ? format(new Date(data.temporal.recordingStart), "PPpp")
                  : null
              }
            />
            <DataRow
              label="Recording End"
              value={
                data.temporal.recordingEnd
                  ? format(new Date(data.temporal.recordingEnd), "PPpp")
                  : null
              }
            />
            <DataRow
              label="Duration"
              value={
                data.temporal.durationSeconds
                  ? formatDuration(data.temporal.durationSeconds)
                  : null
              }
            />
            <DataRow
              label="Temporal Gaps"
              value={
                data.temporal.gapsDetected === 0
                  ? "None detected"
                  : `${data.temporal.gapsDetected} gap(s)`
              }
              good={data.temporal.gapsDetected === 0}
              bad={data.temporal.gapsDetected > 0}
            />
          </div>
        )}

        {/* Chain of Custody */}
        {hasAuditLog && (
          <div className="text-sm">
            <SectionHeader
              icon={ScrollText}
              title="Chain of Custody"
              number={nextSection()}
            />
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Timestamp
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Action
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      User
                    </th>
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      IP
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.auditLog.map((entry, idx) => (
                    <tr
                      key={idx}
                      className={idx % 2 === 1 ? "bg-muted/30" : ""}
                    >
                      <td className="px-3 py-1.5">
                        {format(new Date(entry.timestamp), "PPpp")}
                      </td>
                      <td className="px-3 py-1.5">
                        {formatAuditAction(entry.action)}
                      </td>
                      <td className="px-3 py-1.5">
                        {entry.userEmail || "System"}
                      </td>
                      <td className="px-3 py-1.5 font-mono">
                        {entry.ipAddress || "\u2014"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Methodology */}
        <div className="text-sm">
          <SectionHeader
            icon={Scale}
            title="Verification Methodology"
            number={nextSection()}
          />
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              <span className="font-semibold text-foreground">
                Cryptographic Verification:
              </span>{" "}
              Each video frame is individually hashed (SHA-256) and grouped
              into GOPs. Each GOP hash is digitally signed using a TPM-bound
              video signing key embedded in the originating camera.
            </p>
            <p>
              <span className="font-semibold text-foreground">PKI:</span>{" "}
              Device identity verified via IEEE 802.1AR (IDevID) certificates
              issued by Axis Communications, validated against Axis Root CAs.
            </p>
            <p>
              <span className="font-semibold text-foreground">
                GOP Chain Linking:
              </span>{" "}
              Adjacent GOPs are cryptographically linked to prevent
              undetectable segment removal or insertion.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 space-y-1 text-center text-xs text-muted-foreground">
          <p>
            <span className="font-semibold">Verification ID:</span>{" "}
            <span className="font-mono">{data.verificationId}</span>
          </p>
          {data.certificateHash && (
            <p>
              <span className="font-semibold">Certificate SHA-256:</span>{" "}
              <span className="font-mono text-[10px]">
                {data.certificateHash}
              </span>
            </p>
          )}
          {data.publicToken && (
            <p>
              Verify online:{" "}
              {process.env.NEXT_PUBLIC_APP_URL || "https://edgeproof.com"}
              /verify/{data.publicToken}
            </p>
          )}
          <p className="mt-2">
            Issued: {format(new Date(data.issuedAt), "PPpp")}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
