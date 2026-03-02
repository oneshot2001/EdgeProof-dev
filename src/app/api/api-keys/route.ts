import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  API_KEY_LOOKUP_PREFIX_LENGTH,
  hashApiKey,
} from "@/lib/auth/api-keys";

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
});

// List API keys (returns prefix + metadata only, never the full key)
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  // Check enterprise tier
  const { data: profile } = await supabase
    .from("users")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_tier !== "enterprise") {
    return NextResponse.json(
      { error: "API access requires Enterprise plan" },
      { status: 403 }
    );
  }

  const { data: keys, error } = await supabase
    .from("api_keys")
    .select("id, key_prefix, name, permissions, last_used_at, expires_at, revoked, created_at")
    .eq("user_id", user.id)
    .eq("revoked", false)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
  }

  return NextResponse.json({ keys: keys || [] });
}

// Create a new API key
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("subscription_tier, team_id")
    .eq("id", user.id)
    .single();

  if (profile?.subscription_tier !== "enterprise") {
    return NextResponse.json(
      { error: "API access requires Enterprise plan" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = createKeySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Generate API key: ep_live_ + 32 random bytes (hex-encoded)
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  const rawKey = `ep_live_${Array.from(randomBytes).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
  const prefix = rawKey.slice(0, API_KEY_LOOKUP_PREFIX_LENGTH);
  const keyHash = await hashApiKey(rawKey);

  const { error: insertError } = await supabase
    .from("api_keys")
    .insert({
      user_id: user.id,
      team_id: profile.team_id || null,
      key_hash: keyHash,
      key_prefix: prefix,
      name: parsed.data.name,
      permissions: ["verify", "read"],
      last_used_at: null,
      expires_at: null,
    });

  if (insertError) {
    console.error("API key insert error:", insertError);
    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }

  // Return the raw key ONCE — it can never be retrieved again
  return NextResponse.json({
    key: rawKey,
    prefix,
    name: parsed.data.name,
    message: "Save this key now. It cannot be shown again.",
  });
}

// Revoke an API key
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const keyId = searchParams.get("id");

  if (!keyId) {
    return NextResponse.json({ error: "Key ID required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("api_keys")
    .update({ revoked: true })
    .eq("id", keyId)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: "Failed to revoke key" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
