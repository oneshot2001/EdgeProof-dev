import { NextRequest, NextResponse } from "next/server";
import { MOCK_AUTHENTIC_RESULT } from "@/lib/verification/mock-data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate API key
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ep_live_")) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 }
    );
  }

  // TODO: Look up verification in database
  // For now, return mock authentic result
  return NextResponse.json({
    ...MOCK_AUTHENTIC_RESULT,
    verification_id: id,
  });
}
