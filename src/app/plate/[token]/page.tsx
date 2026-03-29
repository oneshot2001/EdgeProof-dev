import type { Metadata } from "next";
import Link from "next/link";
import {
  Shield,
  Car,
  Clock,
  Camera,
  MapPin,
  FileText,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createServiceClient } from "@/lib/supabase/server";
import type { PlateCertificate, PlateRead } from "@/types/lpr";

interface PublicPlatePageProps {
  params: Promise<{ token: string }>;
}

type PlateRecordWithCert = PlateRead & {
  plate_certificates: PlateCertificate | null;
};

async function getPlateRecord(token: string): Promise<PlateRecordWithCert | null> {
  const serviceClient = await createServiceClient();

  // First try looking up via plate_certificates.public_token
  const { data: byCert } = await serviceClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("plate_certificates" as any)
    .select("*, plate_reads(*)")
    .eq("public_token", token)
    .single();

  if (byCert && (byCert as unknown as Record<string, unknown>).plate_reads) {
    const raw = byCert as unknown as Record<string, unknown>;
    const read = raw.plate_reads as PlateRead;
    const certFields = { ...raw };
    delete certFields.plate_reads;
    return { ...read, plate_certificates: certFields as unknown as PlateCertificate };
  }

  // Fallback: lookup via plate_reads.public_token
  const { data: byRead } = await serviceClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("plate_reads" as any)
    .select("*, plate_certificates(*)")
    .eq("public_token", token)
    .single();

  if (byRead) {
    return byRead as unknown as PlateRecordWithCert;
  }

  return null;
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

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder > 0 ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function confidenceLabel(pct: number): string {
  if (pct >= 90) return "High";
  if (pct >= 70) return "Medium";
  return "Low";
}

function confidenceColor(pct: number): string {
  if (pct >= 90) return "text-green-600 dark:text-green-400";
  if (pct >= 70) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

type CertTier = 1 | 2 | 3;

function TierBadge({ tier }: { tier: CertTier }) {
  if (tier === 1) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 dark:border-green-900 dark:bg-green-950">
        <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
        <div>
          <p className="text-sm font-semibold text-green-800 dark:text-green-200">
            Tier 1 — Full Cryptographic Chain
          </p>
          <p className="text-xs text-green-700 dark:text-green-300">
            Hardware-rooted: Edge Vault signed video + AXIS LPR
          </p>
        </div>
      </div>
    );
  }
  if (tier === 2) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900 dark:bg-amber-950">
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
            Tier 2 — Plate-Only Record
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300">
            AXIS LPR only — video not cryptographically verified
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950">
      <Info className="h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
      <div>
        <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
          Tier 3 — Third-Party VMS Record
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          LPR event sourced from third-party VMS
        </p>
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: PublicPlatePageProps): Promise<Metadata> {
  const { token } = await params;
  const record = await getPlateRecord(token);

  if (!record) {
    return {
      title: "Record Not Found — PlateProof",
      description: "This vehicle presence certificate link is invalid or has expired.",
    };
  }

  const plate = record.plate_text ?? "Unknown";
  const certNumber = record.plate_certificates?.cert_number ?? null;
  const title = certNumber
    ? `${plate} — Certificate ${certNumber} — PlateProof`
    : `${plate} — Vehicle Presence Record — PlateProof`;

  return {
    title,
    description: `Certified Vehicle Presence Record for plate ${plate}. ${certNumber ? `Certificate ${certNumber}.` : ""} Issued by PlateProof.`,
    openGraph: {
      title: `PlateProof: ${plate}`,
      description: `Certified Vehicle Presence Record — ${plate}`,
      type: "website",
    },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function PublicPlatePage({ params }: PublicPlatePageProps) {
  const { token } = await params;
  const record = await getPlateRecord(token);

  if (!record) {
    return (
      <div className="flex min-h-screen flex-col bg-muted/30">
        <PlateHeader />
        <main className="flex flex-1 items-center justify-center px-4 py-16">
          <Card className="w-full max-w-md text-center">
            <CardContent className="py-12">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h1 className="mt-6 text-xl font-bold">Record Not Found</h1>
              <p className="mt-3 text-sm text-muted-foreground">
                This vehicle presence certificate link is invalid or has expired.
                The token may have been mistyped, or the record may no longer be
                publicly accessible.
              </p>
              <p className="mt-4 text-xs text-muted-foreground">
                If you believe this is an error, contact the party who provided
                this link.
              </p>
            </CardContent>
          </Card>
        </main>
        <PlateFooter />
      </div>
    );
  }

  const cert = record.plate_certificates;
  const tier = (cert?.tier ?? 2) as CertTier;

  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <PlateHeader certNumber={cert?.cert_number ?? undefined} />

      <main className="flex-1 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Title block */}
          <div className="text-center">
            <Badge variant="secondary" className="mb-3 text-xs font-medium uppercase tracking-wider">
              Certified Vehicle Presence Record
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Certificate of Vehicle Presence
            </h1>
            {cert?.cert_number && (
              <p className="mt-1 font-mono text-sm text-muted-foreground">
                {cert.cert_number}
              </p>
            )}
          </div>

          {/* Tier badge */}
          <TierBadge tier={tier} />

          {/* Vehicle Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Car className="h-4 w-4" />
                Vehicle Identity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Large plate display */}
              <div className="flex items-center justify-center rounded-lg border-2 border-foreground/20 bg-background py-4">
                <span className="font-mono text-4xl font-black tracking-widest">
                  {record.plate_text}
                </span>
              </div>

              {record.plate_confidence != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Read Confidence</span>
                  <span className={`font-medium ${confidenceColor(record.plate_confidence)}`}>
                    {confidenceLabel(record.plate_confidence)} ({record.plate_confidence}%)
                  </span>
                </div>
              )}

              {/* Vehicle description */}
              {(record.vehicle_make || record.vehicle_color || record.vehicle_type) && (
                <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                  {record.vehicle_make && (
                    <div>
                      <dt className="text-muted-foreground">Make</dt>
                      <dd className="mt-0.5 font-medium">{record.vehicle_make}</dd>
                    </div>
                  )}
                  {record.vehicle_model && (
                    <div>
                      <dt className="text-muted-foreground">Model</dt>
                      <dd className="mt-0.5 font-medium">{record.vehicle_model}</dd>
                    </div>
                  )}
                  {record.vehicle_color && (
                    <div>
                      <dt className="text-muted-foreground">Color</dt>
                      <dd className="mt-0.5 font-medium capitalize">{record.vehicle_color}</dd>
                    </div>
                  )}
                  {record.vehicle_type && (
                    <div>
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="mt-0.5 font-medium capitalize">{record.vehicle_type}</dd>
                    </div>
                  )}
                </dl>
              )}

              {/* Thumbnail */}
              {record.plate_thumbnail_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={record.plate_thumbnail_url}
                  alt={`Vehicle thumbnail — ${record.plate_text}`}
                  className="h-auto w-full rounded-md border object-cover"
                />
              )}
            </CardContent>
          </Card>

          {/* Temporal Record */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Temporal Record
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted-foreground">First Seen</dt>
                  <dd className="mt-0.5 font-medium">{formatDateTime(record.first_seen)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Last Seen</dt>
                  <dd className="mt-0.5 font-medium">
                    {record.last_seen ? formatDateTime(record.last_seen) : "—"}
                  </dd>
                </div>
                {record.dwell_seconds != null && record.dwell_seconds > 0 && (
                  <div>
                    <dt className="text-muted-foreground">Dwell Time</dt>
                    <dd className="mt-0.5 font-medium">{formatDuration(record.dwell_seconds)}</dd>
                  </div>
                )}
                {record.direction && (
                  <div>
                    <dt className="text-muted-foreground">Direction</dt>
                    <dd className="mt-0.5 font-medium capitalize">{record.direction}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          {/* Camera & Site Provenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Camera className="h-4 w-4" />
                Camera & Site Provenance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                {record.camera_id && (
                  <div>
                    <dt className="text-muted-foreground">Camera ID</dt>
                    <dd className="mt-0.5 font-mono text-xs">{record.camera_id}</dd>
                  </div>
                )}
                {record.camera_serial && (
                  <div>
                    <dt className="text-muted-foreground">Camera Serial</dt>
                    <dd className="mt-0.5 font-mono text-xs">{record.camera_serial}</dd>
                  </div>
                )}
                {record.site_id && (
                  <div>
                    <dt className="text-muted-foreground">Site</dt>
                    <dd className="mt-0.5 font-medium">{record.site_id}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="mt-0.5 font-medium capitalize">
                    {record.source?.replace(/_/g, " ") ?? "AXIS LPR"}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Cryptographic Chain — Tier 1 only */}
          {tier === 1 && cert?.edgeproof_verification_id && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4" />
                  Cryptographic Chain
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div>
                    <dt className="text-muted-foreground">EdgeProof Verification</dt>
                    <dd className="mt-0.5 break-all font-mono text-xs">
                      {cert.edgeproof_verification_id}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-muted-foreground">
                      Signed video verified via Axis Edge Vault (hardware-rooted key)
                    </span>
                  </div>
                  <div className="pt-1">
                    <Link
                      href={`/verify/${cert.edgeproof_verification_id}`}
                      className="text-xs font-medium text-primary underline underline-offset-4 hover:text-primary/80"
                    >
                      View full video verification report →
                    </Link>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          {/* Certificate Metadata */}
          {cert && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-4 w-4" />
                  Certificate Metadata
                </CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Certificate Number</dt>
                    <dd className="mt-0.5 font-mono font-medium">{cert.cert_number}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Issued</dt>
                    <dd className="mt-0.5 font-medium">{formatDateTime(cert.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Public Token</dt>
                    <dd className="mt-0.5 break-all font-mono text-xs">{cert.public_token}</dd>
                  </div>
                  {cert.pdf_sha256 && (
                    <div className="sm:col-span-2">
                      <dt className="text-muted-foreground">PDF SHA-256</dt>
                      <dd className="mt-0.5 break-all font-mono text-xs">{cert.pdf_sha256}</dd>
                    </div>
                  )}
                </dl>
                {cert.pdf_storage_path && (
                  <div className="mt-4">
                    <Button variant="outline" size="sm" asChild>
                      <a href={`/api/v1/lpr/certificates/${cert.id}/download`}>
                        <FileText className="mr-2 h-4 w-4" />
                        Download PDF Certificate
                      </a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* About */}
          <Card className="border-dashed">
            <CardContent className="py-6">
              <div className="flex gap-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">About This Record</p>
                  <p className="mt-2">
                    This Certificate of Vehicle Presence was issued by PlateProof, a
                    certified LPR record service built on EdgeProof infrastructure.
                    {tier === 1 && (
                      " Tier 1 certificates include a full cryptographic chain linking the plate read to hardware-signed video from an Axis Edge Vault camera."
                    )}
                    {tier === 2 && (
                      " Tier 2 certificates record the plate read from an AXIS LPR camera without signed video verification. The plate data is authentic but the video frame is not cryptographically attested."
                    )}
                    {tier === 3 && (
                      " Tier 3 certificates record plate reads from third-party VMS sources. Source provenance is noted but no cryptographic attestation is available."
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <div className="rounded-xl border bg-card p-6 text-center sm:p-8">
            <h2 className="text-lg font-semibold">
              Need certified vehicle presence records for your site?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              PlateProof generates court-ready Certificates of Vehicle Presence from
              your existing AXIS LPR cameras. Connect in minutes — no new hardware
              required.
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

      <PlateFooter />
    </div>
  );
}

function PlateHeader({ certNumber }: { certNumber?: string }) {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Car className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold">PlateProof</span>
        </Link>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <FileText className="h-3 w-3" />
          <span>{certNumber ? `Certificate ${certNumber}` : "Vehicle Presence Record"}</span>
        </div>
      </div>
    </header>
  );
}

function PlateFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t bg-background py-6">
      <div className="mx-auto max-w-3xl px-4 text-center text-xs text-muted-foreground">
        <p>{year} PlateProof. Certified Vehicle Presence Records.</p>
        <p className="mt-1">
          This record is provided for informational purposes. Consult legal
          counsel regarding the admissibility of LPR evidence in your jurisdiction.
        </p>
      </div>
    </footer>
  );
}
