import { createServiceClient } from "@/lib/supabase/server";
import { type AuditAction } from "@/types/database";

interface LogAuditEventOptions {
  verificationId: string;
  userId?: string | null;
  action: AuditAction;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAuditEvent(options: LogAuditEventOptions): Promise<void> {
  try {
    const supabase = await createServiceClient();

    await supabase.from("audit_log").insert({
      verification_id: options.verificationId,
      user_id: options.userId || null,
      action: options.action,
      ip_address: options.ipAddress || null,
      user_agent: options.userAgent || null,
      metadata: options.metadata || {},
    });
  } catch (err) {
    // Best-effort logging — don't fail the request
    console.error("Failed to log audit event:", err);
  }
}
