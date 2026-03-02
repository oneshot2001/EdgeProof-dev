import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  buildCertificateData,
  generateCertificatePdf,
} from "@/lib/pdf/certificate";
import { type AuditEntry } from "@/types/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Authenticate user
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch verification (RLS scoped to user)
  const { data: verification, error: queryError } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id)
    .single();

  if (queryError || !verification) {
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 404 }
    );
  }

  // Only generate certificates for terminal verification statuses
  const terminalStatuses = [
    "authentic",
    "tampered",
    "unsigned",
    "inconclusive",
  ];
  if (!terminalStatuses.includes(verification.status)) {
    return NextResponse.json(
      { error: "Verification is not yet complete" },
      { status: 400 }
    );
  }

  // Fetch audit log for chain of custody (Enterprise feature)
  // Use service client to bypass RLS for complete audit trail
  const serviceClient = await createServiceClient();
  let auditEntries: AuditEntry[] = [];

  try {
    const { data: auditRows } = await serviceClient
      .from("audit_log")
      .select("action, created_at, user_id, ip_address, metadata")
      .eq("verification_id", id)
      .order("created_at", { ascending: true });

    if (auditRows && auditRows.length > 0) {
      // Fetch user emails for audit entries
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
    // Audit log fetch failure is non-fatal; proceed without chain of custody
  }

  // Build certificate data
  const certData = buildCertificateData(verification, auditEntries);

  // Generate PDF
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://edgeproof.com";

  try {
    const { buffer, hash } = await generateCertificatePdf(certData, appUrl);

    // Persist hash once. PDF content is deterministic and re-downloads should not rotate it.
    if (!verification.certificate_hash) {
      await supabase
        .from("verifications")
        .update({ certificate_hash: hash })
        .eq("id", id);
    }

    // Log the PDF download in the audit trail
    try {
      await serviceClient.from("audit_log").insert({
        verification_id: id,
        user_id: user.id,
        action: "downloaded_pdf" as const,
        ip_address: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
        user_agent: request.headers.get("user-agent") || null,
        metadata: { certificate_hash: hash },
      });
    } catch {
      // Audit logging failure is non-fatal
    }

    // Sanitize the filename for Content-Disposition
    const safeName = verification.file_name
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .slice(0, 100);

    // Convert Node.js Buffer to Uint8Array for NextResponse compatibility
    const pdfBytes = new Uint8Array(buffer);

    return new NextResponse(pdfBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="EdgeProof-Certificate-${safeName}.pdf"`,
        "Content-Length": String(buffer.length),
        "X-Certificate-Hash": hash,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
