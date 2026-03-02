import Link from "next/link";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CertificatePreview } from "@/components/certificate/CertificatePreview";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildCertificateData } from "@/lib/pdf/certificate";
import { type AuditEntry } from "@/types/api";

interface CertificatePageProps {
  params: Promise<{ id: string }>;
}

export default async function CertificatePage({
  params,
}: CertificatePageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: verification } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id)
    .single();

  if (!verification) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <FileText className="h-12 w-12 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-bold">Certificate Not Found</h1>
        <p className="mt-2 text-muted-foreground">
          The certificate you&apos;re looking for doesn&apos;t exist or you
          don&apos;t have access to it.
        </p>
        <Button asChild className="mt-4">
          <Link href="/verifications">Back to Verifications</Link>
        </Button>
      </div>
    );
  }

  // Fetch audit log for chain of custody
  let auditEntries: AuditEntry[] = [];
  try {
    const serviceClient = await createServiceClient();
    const { data: auditRows } = await serviceClient
      .from("audit_log")
      .select("action, created_at, user_id, ip_address, metadata")
      .eq("verification_id", id)
      .order("created_at", { ascending: true });

    if (auditRows && auditRows.length > 0) {
      const userIds = [
        ...new Set(
          auditRows
            .map((r) => r.user_id)
            .filter((uid): uid is string => uid !== null)
        ),
      ];

      let userEmailMap: Record<string, string> = {};
      if (userIds.length > 0) {
        const { data: users } = await serviceClient
          .from("users")
          .select("id, email")
          .in("id", userIds);

        if (users) {
          userEmailMap = Object.fromEntries(
            users.map((u) => [u.id, u.email])
          );
        }
      }

      auditEntries = auditRows.map((row) => ({
        action: row.action,
        timestamp: row.created_at,
        userEmail: row.user_id ? (userEmailMap[row.user_id] || null) : null,
        ipAddress: row.ip_address,
        metadata: (row.metadata as Record<string, unknown>) || {},
      }));
    }
  } catch {
    // Non-fatal: proceed without chain of custody data
  }

  const certData = buildCertificateData(verification, auditEntries);

  // Determine if the verification is in a terminal state for PDF download
  const canDownload = [
    "authentic",
    "tampered",
    "unsigned",
    "inconclusive",
  ].includes(verification.status);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/verifications/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Certificate of Authenticity</h1>
        </div>
        {canDownload && (
          <Button asChild>
            <a href={`/api/certificates/${id}/pdf`} download>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </a>
          </Button>
        )}
      </div>

      <CertificatePreview data={certData} />

      {!canDownload && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center text-sm text-amber-800">
          PDF download will be available once verification is complete.
        </div>
      )}
    </div>
  );
}
