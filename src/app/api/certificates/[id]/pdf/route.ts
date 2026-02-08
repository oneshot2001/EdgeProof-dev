import { NextRequest, NextResponse } from "next/server";
import { MOCK_VERIFICATIONS } from "@/lib/mock/data";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const verification = MOCK_VERIFICATIONS.find((v) => v.id === id);

  if (!verification) {
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 404 }
    );
  }

  // In production, this would use @react-pdf/renderer to generate a real PDF.
  // For dev mode, return a simple text-based placeholder.
  // The actual PDF generation is in src/lib/pdf/certificate.ts
  const pdfContent = `
EDGEPROOF - CERTIFICATE OF VIDEO AUTHENTICITY
================================================

Verification ID: ${verification.id}
Status: ${verification.status.toUpperCase()}
File: ${verification.file_name}
File Hash (SHA-256): ${verification.file_hash_sha256}

DEVICE ORIGIN
--------------
Serial: ${verification.device_serial || "N/A"}
Model: ${verification.device_model || "N/A"}
Firmware: ${verification.device_firmware || "N/A"}

INTEGRITY
----------
Total GOPs: ${verification.total_gops ?? "N/A"}
Verified GOPs: ${verification.verified_gops ?? "N/A"}
Total Frames: ${verification.total_frames ?? "N/A"}
Verified Frames: ${verification.verified_frames ?? "N/A"}

TEMPORAL
---------
Recording Start: ${verification.recording_start || "N/A"}
Recording End: ${verification.recording_end || "N/A"}
Duration: ${verification.recording_duration_seconds ?? "N/A"} seconds
Gaps Detected: ${verification.gaps_detected}

Generated: ${new Date().toISOString()}
Public Verification: ${process.env.NEXT_PUBLIC_APP_URL}/verify/${verification.public_token}
  `.trim();

  return new NextResponse(pdfContent, {
    headers: {
      "Content-Type": "text/plain",
      "Content-Disposition": `attachment; filename="EdgeProof-Certificate-${id}.txt"`,
    },
  });
}
