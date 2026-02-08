"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "./VerdictBadge";
import { DeviceInfo } from "./DeviceInfo";
import { IntegrityReport } from "./IntegrityReport";
import { TemporalReport } from "./TemporalReport";
import { ChainOfCustody } from "./ChainOfCustody";
import { type VerificationPollResponse } from "@/types/api";
import { type AuditLogEntry } from "@/types/database";

interface VerificationResultProps {
  verification: VerificationPollResponse;
  auditLog?: AuditLogEntry[];
  isEnterprise?: boolean;
}

export function VerificationResult({
  verification,
  auditLog = [],
  isEnterprise = false,
}: VerificationResultProps) {
  return (
    <div className="space-y-6">
      <VerdictBadge status={verification.status} />

      <div className="flex gap-3">
        {verification.certificate_url && (
          <Button asChild>
            <a href={verification.certificate_url} download>
              <Download className="mr-2 h-4 w-4" />
              Download Certificate
            </a>
          </Button>
        )}
        {verification.public_token && (
          <Button variant="outline" asChild>
            <a
              href={`/verify/${verification.public_token}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View Public Page
            </a>
          </Button>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <DeviceInfo
          serial={verification.device_serial}
          model={verification.device_model}
          firmware={null}
          certChainValid={verification.cert_chain_valid}
          certIntermediate={null}
          certRoot={null}
          attestationValid={verification.attestation_valid}
        />
        <IntegrityReport
          totalGops={verification.total_gops}
          verifiedGops={verification.verified_gops}
          tamperedGops={verification.tampered_gops}
          totalFrames={verification.total_frames}
          verifiedFrames={verification.verified_frames}
          tamperedFrames={verification.tampered_frames}
        />
      </div>

      <TemporalReport
        recordingStart={verification.recording_start}
        recordingEnd={verification.recording_end}
        durationSeconds={verification.recording_duration_seconds}
        gapsDetected={verification.gaps_detected}
      />

      <ChainOfCustody auditLog={auditLog} isEnterprise={isEnterprise} />
    </div>
  );
}
