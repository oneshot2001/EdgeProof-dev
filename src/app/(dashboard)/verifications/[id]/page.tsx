import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationResult } from "@/components/verification/VerificationResult";
import { MOCK_VERIFICATIONS } from "@/lib/mock/data";
import { MOCK_AUDIT_LOG } from "@/lib/mock/data";

interface VerificationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function VerificationDetailPage({
  params,
}: VerificationDetailPageProps) {
  const { id } = await params;
  const verification = MOCK_VERIFICATIONS.find((v) => v.id === id);

  if (!verification) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl font-bold">Verification Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The verification you&apos;re looking for doesn&apos;t exist.
        </p>
        <Button asChild className="mt-4">
          <Link href="/verifications">Back to Verifications</Link>
        </Button>
      </div>
    );
  }

  const auditLog = MOCK_AUDIT_LOG.filter(
    (entry) => entry.verification_id === id
  );

  const pollResponse = {
    id: verification.id,
    status: verification.status,
    file_name: verification.file_name,
    device_serial: verification.device_serial,
    device_model: verification.device_model,
    cert_chain_valid: verification.cert_chain_valid,
    total_gops: verification.total_gops,
    verified_gops: verification.verified_gops,
    tampered_gops: verification.tampered_gops,
    total_frames: verification.total_frames,
    verified_frames: verification.verified_frames,
    tampered_frames: verification.tampered_frames,
    recording_start: verification.recording_start,
    recording_end: verification.recording_end,
    recording_duration_seconds: verification.recording_duration_seconds,
    gaps_detected: verification.gaps_detected,
    attestation_valid: verification.attestation_valid,
    public_token: verification.public_token,
    certificate_url: verification.certificate_url,
    completed_at: verification.completed_at,
    created_at: verification.created_at,
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/verifications">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{verification.file_name}</h1>
          <p className="text-sm text-muted-foreground">
            Verification ID: {verification.id}
          </p>
        </div>
      </div>

      <VerificationResult
        verification={pollResponse}
        auditLog={auditLog}
        isEnterprise={false}
      />
    </div>
  );
}
