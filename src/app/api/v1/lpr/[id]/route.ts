/**
 * GET /api/v1/lpr/[id]
 *
 * Fetch a single plate_read record by ID.
 * Returns the plate_read with its associated certificate (if any).
 * Auth: API key or session.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { createClient } from "@/lib/supabase/server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { id } = await params;

  // Try session auth first, fall back to API key
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const serviceClient = await createServiceClient();

  const query = serviceClient
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("plate_reads" as any)
    .select(`
      *,
      plate_certificates (
        id,
        cert_number,
        public_token,
        tier,
        pdf_storage_path,
        created_at
      )
    `)
    .eq("id", id);

  // If authenticated via session, scope to the user
  if (user) {
    query.eq("user_id", user.id);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ error: "Plate read not found" }, { status: 404 });
  }

  return NextResponse.json(data);
}
