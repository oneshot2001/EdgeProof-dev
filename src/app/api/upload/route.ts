import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const uploadSchema = z.object({
  fileName: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  contentType: z.string().refine(
    (ct) => ["video/mp4", "video/x-matroska"].includes(ct),
    "Only MP4 and MKV files are supported"
  ),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = uploadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { fileName, fileSizeBytes } = parsed.data;

    // In production: generate a presigned URL via Supabase Storage
    // For dev: return a mock upload URL and verification ID
    const verificationId = crypto.randomUUID();
    const filePath = `uploads/dev/${verificationId}/${fileName}`;

    return NextResponse.json({
      uploadUrl: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/videos/${filePath}`,
      filePath,
      verificationId,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
