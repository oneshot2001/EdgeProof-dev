import { Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { VerdictBadge } from "@/components/verification/VerdictBadge";
import { MOCK_VERIFICATIONS } from "@/lib/mock/data";

interface PublicVerifyPageProps {
  params: Promise<{ id: string }>;
}

export default async function PublicVerifyPage({ params }: PublicVerifyPageProps) {
  const { id } = await params;

  // Look up by public_token or id
  const verification = MOCK_VERIFICATIONS.find(
    (v) => v.public_token === id || v.id === id
  );

  if (!verification || !verification.is_public) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="py-12">
            <Shield className="mx-auto h-12 w-12 text-muted-foreground" />
            <h1 className="mt-4 text-xl font-bold">
              Verification Not Found
            </h1>
            <p className="mt-2 text-muted-foreground">
              This verification link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4 py-12">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-xl font-bold">EdgeProof Verification</h1>
          <p className="text-sm text-muted-foreground">
            Independent cryptographic verification result
          </p>
        </div>

        <VerdictBadge status={verification.status} />

        <Card>
          <CardContent className="space-y-3 p-6 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File</span>
              <span className="font-medium">{verification.file_name}</span>
            </div>
            {verification.device_model && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Camera</span>
                <span className="font-medium">{verification.device_model}</span>
              </div>
            )}
            {verification.device_serial && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Serial</span>
                <span className="font-mono text-xs">
                  {verification.device_serial}
                </span>
              </div>
            )}
            {verification.total_gops !== null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Integrity</span>
                <span className="font-medium">
                  {verification.verified_gops}/{verification.total_gops} GOPs verified
                </span>
              </div>
            )}
            {verification.recording_start && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recorded</span>
                <span className="font-medium">
                  {new Date(verification.recording_start).toLocaleDateString()}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Verified</span>
              <span className="font-medium">
                {verification.completed_at
                  ? new Date(verification.completed_at).toLocaleDateString()
                  : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Verified by EdgeProof using Axis Communications signed video technology.
          <br />
          Verification ID: {verification.id}
        </p>
      </div>
    </div>
  );
}
