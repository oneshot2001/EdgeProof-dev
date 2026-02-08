import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getMockResult } from "@/lib/verification/mock-data";

const verifySchema = z.object({
  verificationId: z.string().uuid(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  fileSizeBytes: z.number().positive(),
  fileHash: z.string().min(1),
});

// In-memory store for dev mode verification state
const verificationStore = new Map<
  string,
  { status: string; result?: ReturnType<typeof getMockResult> }
>();

export { verificationStore };

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { verificationId, fileName } = parsed.data;

    // Store initial state
    verificationStore.set(verificationId, { status: "processing" });

    // Simulate async verification: resolve after a delay
    // Pick scenario based on filename for demo purposes
    const scenario = fileName.toLowerCase().includes("tamper")
      ? "tampered"
      : fileName.toLowerCase().includes("unsigned")
        ? "unsigned"
        : "authentic";

    setTimeout(() => {
      const result = getMockResult(scenario);
      result.verification_id = verificationId;
      verificationStore.set(verificationId, {
        status: result.status,
        result,
      });
    }, 3000);

    return NextResponse.json({
      verificationId,
      status: "processing",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
