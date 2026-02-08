import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildCertificateData } from "@/lib/pdf/certificate";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

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

  const certificateData = buildCertificateData(verification);

  return NextResponse.json(certificateData);
}
