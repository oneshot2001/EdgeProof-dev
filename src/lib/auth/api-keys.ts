import { createServiceClient } from "@/lib/supabase/server";

export const API_KEY_PREFIX = "ep_live_";
export const API_KEY_LOOKUP_PREFIX_LENGTH = 16;

export interface ValidApiKey {
  id: string;
  user_id: string;
  team_id: string | null;
  expires_at: string | null;
}

export function readApiKeyFromAuthHeader(authHeader: string | null): string | null {
  if (!authHeader?.startsWith(`Bearer ${API_KEY_PREFIX}`)) {
    return null;
  }

  const apiKey = authHeader.replace("Bearer ", "").trim();
  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }

  return apiKey;
}

export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function validateApiKey(
  authHeader: string | null,
  options: { updateLastUsed?: boolean } = {},
): Promise<ValidApiKey | null> {
  const apiKey = readApiKeyFromAuthHeader(authHeader);
  if (!apiKey) {
    return null;
  }

  const keyHash = await hashApiKey(apiKey);
  const keyPrefix = apiKey.slice(0, API_KEY_LOOKUP_PREFIX_LENGTH);

  const serviceClient = await createServiceClient();
  const { data: apiKeyRow } = await serviceClient
    .from("api_keys")
    .select("id, user_id, team_id, expires_at")
    .eq("key_hash", keyHash)
    .eq("key_prefix", keyPrefix)
    .eq("revoked", false)
    .single();

  if (!apiKeyRow) {
    return null;
  }

  if (apiKeyRow.expires_at && new Date(apiKeyRow.expires_at) < new Date()) {
    return null;
  }

  if (options.updateLastUsed) {
    await serviceClient
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyRow.id);
  }

  return apiKeyRow;
}
