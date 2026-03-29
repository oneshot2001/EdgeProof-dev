/**
 * POST /api/v1/lpr/events
 *
 * Receives LPR detection events from AXIS License Plate Verifier via HTTP push.
 * Authenticated via API key (same mechanism as /api/v1/verify).
 *
 * Flow:
 * 1. Validate API key → resolve user_id, team_id, site_id, camera_id
 * 2. Normalize payload into PlateRead
 * 3. Check against plate_lists for this site
 * 4. Insert into plate_reads
 * 5. Return plate_read_id + list match result
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/server";
import { type AxisLPREventPayload, type LPRIngestResponse } from "@/types/lpr";

// ---------------------------------------------------------------------------
// Request validation schema
// ---------------------------------------------------------------------------

const axisLPRSchema = z.object({
  plate_text: z.string().min(1).max(20),
  plate_confidence: z.number().min(0).max(1).default(0),
  vehicle_type: z.string().optional(),
  vehicle_color: z.string().optional(),
  vehicle_make: z.string().optional(),
  vehicle_model: z.string().optional(),
  direction: z.string().optional(),
  lpr_event_type: z.enum(["new", "update", "lost"]).default("lost"),
  region: z.string().optional(),
  plate_thumbnail_url: z.string().url().optional(),
  vehicle_crop_url: z.string().url().optional(),
  list_match: z
    .object({
      type: z.string().optional(),
      description: z.string().optional(),
    })
    .nullable()
    .optional(),
  first_seen: z.string().optional(),
  last_seen: z.string().optional(),

  // Camera identity — can be sent in payload or resolved from API key context
  camera_id: z.string().optional(),
  camera_serial: z.string().optional(),
  site_id: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Auth helper: resolve API key → user context
// ---------------------------------------------------------------------------

type ApiKeyRow = {
  user_id: string;
  team_id: string | null;
  site_id: string | null;
  camera_id: string | null;
  camera_serial: string | null;
  is_active: boolean;
};

async function resolveApiKey(
  authHeader: string | null,
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
): Promise<ApiKeyRow | null> {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.slice(7);

  const { data } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("api_keys" as any)
    .select("user_id, team_id, site_id, camera_id, camera_serial, is_active")
    .eq("key_hash", await hashApiKey(token))
    .single();

  const apiKey = data as ApiKeyRow | null;
  if (!apiKey || !apiKey.is_active) return null;
  return apiKey;
}

/** Simple SHA-256 hex hash for API key lookup. Matches existing api_keys table pattern. */
async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// ---------------------------------------------------------------------------
// List match resolution
// ---------------------------------------------------------------------------

type ListMatchResult = {
  match: "allowlist" | "blocklist" | "watchlist" | "none" | null;
  description: string | null;
};

async function checkPlateList(
  plateText: string,
  siteId: string,
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
): Promise<ListMatchResult> {
  // Prefer camera-reported list match (already evaluated on-device)
  // but also verify against our server-side list
  const { data: raw } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("plate_lists" as any)
    .select("list_type, description")
    .eq("site_id", siteId)
    .eq("plate_text", plateText.toUpperCase())
    .order("list_type") // blocklist < watchlist (alphabetical priority)
    .limit(1)
    .single();

  const data = raw as { list_type: string; description: string | null } | null;
  if (!data) return { match: "none", description: null };

  const match = data.list_type as "allowlist" | "blocklist" | "watchlist";
  return { match, description: data.description ?? null };
}

// ---------------------------------------------------------------------------
// Certificate number generation: PP-YYYY-NNNNN
// ---------------------------------------------------------------------------

async function nextCertNumber(
  supabase: Awaited<ReturnType<typeof createServiceClient>>,
): Promise<string> {
  const year = new Date().getFullYear();
  const { count } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("plate_certificates" as any)
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${year}-01-01`)
    .lt("created_at", `${year + 1}-01-01`);

  const seq = ((count ?? 0) + 1).toString().padStart(5, "0");
  return `PP-${year}-${seq}`;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const supabase = await createServiceClient();

  // 1. Auth
  const apiKeyCtx = await resolveApiKey(req.headers.get("authorization"), supabase);
  if (!apiKeyCtx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse + validate body
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = axisLPRSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const payload = parsed.data as AxisLPREventPayload & {
    lpr_event_type: "new" | "update" | "lost";
    camera_id?: string;
    camera_serial?: string;
    site_id?: string;
  };

  // Resolve identifiers: payload overrides API key context
  const siteId = payload.site_id ?? apiKeyCtx.site_id ?? "default";
  const cameraId = payload.camera_id ?? apiKeyCtx.camera_id ?? "unknown";
  const cameraSerial = payload.camera_serial ?? apiKeyCtx.camera_serial ?? null;

  // 3. Normalize timestamps
  const now = new Date().toISOString();
  const firstSeen = payload.first_seen ?? now;
  const lastSeen = payload.last_seen ?? null;

  let dwellSeconds: number | null = null;
  if (firstSeen && lastSeen) {
    const delta = (new Date(lastSeen).getTime() - new Date(firstSeen).getTime()) / 1000;
    if (delta >= 0) dwellSeconds = Math.round(delta);
  }

  // 4. Check plate lists
  const plateText = payload.plate_text.toUpperCase().trim();
  const serverListMatch = await checkPlateList(plateText, siteId, supabase);

  // Reconcile: prefer camera-reported match, fall back to server check
  const cameraListMatch = payload.list_match?.type ?? null;
  const resolvedMatch = cameraListMatch ?? serverListMatch.match ?? null;
  const resolvedDesc =
    payload.list_match?.description ?? serverListMatch.description ?? null;

  // 5. Insert plate_read
  const { data: plateReadRaw, error: insertError } = await supabase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("plate_reads" as any)
    .insert({
      user_id: apiKeyCtx.user_id,
      team_id: apiKeyCtx.team_id ?? null,
      site_id: siteId,
      camera_id: cameraId,
      camera_serial: cameraSerial,
      plate_text: plateText,
      plate_confidence: payload.plate_confidence ?? 0,
      vehicle_type: payload.vehicle_type ?? null,
      vehicle_color: payload.vehicle_color ?? null,
      vehicle_make: payload.vehicle_make ?? null,
      vehicle_model: payload.vehicle_model ?? null,
      first_seen: firstSeen,
      last_seen: lastSeen,
      dwell_seconds: dwellSeconds,
      direction: payload.direction ?? null,
      event_type: payload.lpr_event_type,
      source: "http_webhook",
      raw_json: rawBody,
      plate_thumbnail_url: payload.plate_thumbnail_url ?? null,
      vehicle_crop_url: payload.vehicle_crop_url ?? null,
      list_match: resolvedMatch,
      list_description: resolvedDesc,
      verification_status: "pending",
    })
    .select("id")
    .single();

  const plateRead = plateReadRaw as { id: string } | null;
  if (insertError || !plateRead) {
    console.error("[LPR ingest] insert failed:", insertError);
    return NextResponse.json({ error: "Failed to store plate read" }, { status: 500 });
  }

  // 6. Build response
  const response: LPRIngestResponse = {
    plate_read_id: plateRead.id,
    plate_text: plateText,
    list_match: resolvedMatch as LPRIngestResponse["list_match"],
    auto_cert_queued: false, // Phase 1+: trigger auto-cert for watchlist hits
  };

  return NextResponse.json(response, { status: 201 });
}
