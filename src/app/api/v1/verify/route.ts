import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const apiVerifySchema = z.object({
  file_url: z.string().url().optional(),
  callback_url: z.string().url().optional(),
});

export async function POST(request: NextRequest) {
  // Validate API key
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ep_live_")) {
    return NextResponse.json(
      { error: "Invalid API key. Use a valid ep_live_ prefixed key." },
      { status: 401 }
    );
  }

  // TODO: Look up API key hash in database, check permissions, check enterprise tier

  try {
    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // File upload via form data
      const formData = await request.formData();
      const file = formData.get("file");
      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      const verificationId = crypto.randomUUID();
      return NextResponse.json({
        verification_id: verificationId,
        status: "processing",
        poll_url: `/api/v1/verifications/${verificationId}`,
      });
    } else {
      // JSON body with file_url
      const body = await request.json();
      const parsed = apiVerifySchema.safeParse(body);

      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid request", details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const verificationId = crypto.randomUUID();
      return NextResponse.json({
        verification_id: verificationId,
        status: "processing",
        poll_url: `/api/v1/verifications/${verificationId}`,
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
