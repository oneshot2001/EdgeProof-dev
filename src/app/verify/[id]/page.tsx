import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  ExternalLink,
  FileText,
  Clock,
  Fingerprint,
  ArrowRight,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VerdictBadge } from "@/components/verification/VerdictBadge";
import { DeviceInfo } from "@/components/verification/DeviceInfo";
import { IntegrityReport } from "@/components/verification/IntegrityReport";
import { TemporalReport } from "@/components/verification/TemporalReport";
import { createServiceClient } from "@/lib/supabase/server";
import { type Verification, type VerificationStatus } from "@/types/database";

interface PublicVerifyPageProps {
  params: Promise<{ id: string }>;
}

async function getVerification(token: string): Promise<Verification | null> {
  const serviceClient = await createServiceClient();

  // Look up by public_token first, then by id
  const { data: byToken } = await serviceClient
    .from("verifications")
    .select("*")
    .eq("public_token", token)
    .eq("is_public", true)
    .single();

  if (byToken) {
    return byToken;
  }

  const { data: byId } = await serviceClient
    .from("verifications")
    .select("*")
    .eq("id", token)
    .eq("is_public", true)
    .single();

  return byId;
}

function isTerminalStatus(status: VerificationStatus): boolean {
  return ["authentic", "tampered", "unsigned", "inconclusive", "error"].includes(status);
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export async function generateMetadata({ params }: PublicVerifyPageProps): Promise<Metadata> {
  const { id } = await params;
  const verification = await getVerification(id);

  if (!verification) {
    return {
      title: "Verification Not Found - EdgeProof",
      description: "This verification link is invalid or has expired.",
    };
  }

  const statusLabels: Record<string, string> = {
    authentic: "Verified Authentic",
    tampered: "Tampering Detected",
    unsigned: "Unsigned Video",
    inconclusive: "Inconclusive",
    error: "Verification Error",
    processing: "Processing",
    pending: "Pending",
    uploading: "Uploading",
  };

  const statusLabel = statusLabels[verification.status] || "Verification Result";

  return {
    title: `${statusLabel} - ${verification.file_name} - EdgeProof`,
    description: `Independent cryptographic verification result for ${verification.file_name}. Status: ${statusLabel}. Verified by EdgeProof using Axis Communications signed video technology.`,
    openGraph: {
      title: `EdgeProof Verification: ${statusLabel}`,
      description: `Cryptographic verification of ${verification.file_name} completed by EdgeProof.`,
      type: "website",
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicVerifyPage({ params }: PublicVerifyPageProps) {
  const { id } = await params;
  const verification = await getVerification(id);

  if (!verification) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md text-center">
            <CardContent className="py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="mt-6 text-xl font-bold">Verification Not Found</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                This verification link is invalid or has expired. The token may
                have been mistyped, or the verification record may no longer be
                publicly accessible.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                If you believe this is an error, contact the party who provided
                this link.
              </p>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  // Handle non-terminal states (still processing)
  if (!isTerminalStatus(verification.status)) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <PublicHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md text-center">
            <CardContent className="py-12">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
              <h1 className="mt-6 text-xl font-bold">Verification In Progress</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                This video is currently being analyzed. Cryptographic signature
                verification typically completes within 60 seconds.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                Refresh this page in a moment to see the result.
              </p>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <PublicHeader />

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl space-y-8">
          {/* Title block */}
          <div className="text-center">
            <Badge variant="secondary" className="mb-3 text-xs font-medium uppercase tracking-wider">
              Independent Cryptographic Verification
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Video Evidence Verification Report
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Generated by EdgeProof using Axis Communications signed video technology
            </p>
          </div>

          {/* Verdict */}
          <VerdictBadge status={verification.status} />

          {/* File summary card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                File Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">File Name</dt>
                  <dd className="mt-0.5 font-medium break-all">{verification.file_name}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">File Size</dt>
                  <dd className="mt-0.5 font-medium">
                    {formatFileSize(verification.file_size_bytes)}
                  </dd>
                </div>
                {verification.file_hash_sha256 && (
                  <div className="sm:col-span-2">
                    <dt className="text-muted-foreground">SHA-256 Hash</dt>
                    <dd className="mt-0.5 break-all font-mono text-xs">
                      {verification.file_hash_sha256}
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Device + Integrity grid */}
          <div className="grid gap-6 md:grid-cols-2">
            <DeviceInfo
              serial={verification.device_serial}
              model={verification.device_model}
              firmware={verification.device_firmware}
              certChainValid={verification.cert_chain_valid}
              certIntermediate={verification.cert_intermediate}
              certRoot={verification.cert_root}
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

          {/* Temporal Report */}
          <TemporalReport
            recordingStart={verification.recording_start}
            recordingEnd={verification.recording_end}
            durationSeconds={verification.recording_duration_seconds}
            gapsDetected={verification.gaps_detected}
          />

          {/* Verification Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Fingerprint className="h-4 w-4" />
                Verification Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">Verification ID</dt>
                  <dd className="mt-0.5 break-all font-mono text-xs">
                    {verification.id}
                  </dd>
                </div>
                {verification.public_token && (
                  <div>
                    <dt className="text-muted-foreground">Public Token</dt>
                    <dd className="mt-0.5 break-all font-mono text-xs">
                      {verification.public_token}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Submitted</dt>
                  <dd className="mt-0.5 font-medium">
                    {formatDateTime(verification.created_at)}
                  </dd>
                </div>
                {verification.completed_at && (
                  <div>
                    <dt className="text-muted-foreground">Verification Completed</dt>
                    <dd className="mt-0.5 font-medium">
                      {formatDateTime(verification.completed_at)}
                    </dd>
                  </div>
                )}
                {verification.started_at && verification.completed_at && (
                  <div>
                    <dt className="text-muted-foreground">Processing Time</dt>
                    <dd className="mt-0.5 font-medium">
                      {(
                        (new Date(verification.completed_at).getTime() -
                          new Date(verification.started_at).getTime()) /
                        1000
                      ).toFixed(1)}s
                    </dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Technology Explanation */}
          <Card className="border-dashed">
            <CardContent className="py-6">
              <div className="flex gap-4">
                <Shield className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">About This Verification</p>
                  <p className="mt-2">
                    This report was generated by EdgeProof, an independent
                    verification service. Axis Communications cameras embed
                    cryptographic signatures into every frame using hardware-bound
                    keys (IEEE 802.1AR / TPM). EdgeProof validates these signatures,
                    the certificate chain back to the Axis Root CA, and checks for
                    temporal gaps or modifications. No frame of the video is altered
                    during this process.
                  </p>
                  <p className="mt-2">
                    For technical details, see the{" "}
                    <a
                      href="https://www.axis.com/solutions/signed-video"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-foreground underline underline-offset-4 hover:text-primary"
                    >
                      Axis Signed Video documentation
                      <ExternalLink className="ml-1 inline h-3 w-3" />
                    </a>
                    .
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="rounded-xl border bg-card p-6 text-center sm:p-8">
            <h2 className="text-lg font-semibold">
              Need to verify your own video evidence?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              EdgeProof generates court-ready Certificates of Authenticity for
              Axis signed video in under 60 seconds. Start free with 3
              verifications per month.
            </p>
            <Button className="mt-5" asChild>
              <Link href="/signup">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}

function PublicHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold">EdgeProof</span>
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>Public Verification Report</span>
        </div>
      </div>
    </header>
  );
}

function PublicFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background py-6">
      <div className="mx-auto max-w-3xl px-4 text-center text-xs text-muted-foreground">
        <p>
          {year} EdgeProof. Independent cryptographic video verification.
        </p>
        <p className="mt-1">
          This report is provided for informational purposes. Consult legal
          counsel regarding the admissibility of digital evidence in your
          jurisdiction.
        </p>
      </div>
    </footer>
  );
}
