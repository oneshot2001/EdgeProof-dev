import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { buildCertificateData } from "@/lib/pdf/certificate";
import { type AuditEntry } from "@/types/api";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
    // Non-fatal
  }

  const certificateData = buildCertificateData(verification, auditEntries);

  return NextResponse.json(certificateData);
}
