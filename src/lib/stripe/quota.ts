import { createServiceClient } from "@/lib/supabase/server";
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants";

export interface QuotaCheckResult {
  allowed: boolean;
  reason?: string;
  tier: SubscriptionTier;
  used: number;
  limit: number;
  remaining: number;
}

/**
 * Check if a user has remaining verification quota.
 * Called server-side before accepting a new verification.
 */
export async function checkVerificationQuota(
  userId: string
): Promise<QuotaCheckResult> {
  const supabase = await createServiceClient();

  const { data: profile, error } = await supabase
    .from("users")
    .select("subscription_tier, monthly_verifications, monthly_reset_at")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return {
      allowed: false,
      reason: "User profile not found",
      tier: "free",
      used: 0,
      limit: 0,
      remaining: 0,
    };
  }

  const tier = (profile.subscription_tier || "free") as SubscriptionTier;
  const limits = TIER_LIMITS[tier];
  const used = profile.monthly_verifications ?? 0;

  // Enterprise has unlimited verifications
  if (limits.verificationsPerMonth === Infinity) {
    return {
      allowed: true,
      tier,
      used,
      limit: Infinity,
      remaining: Infinity,
    };
  }

  // Check if monthly counter needs reset
  const resetAt = profile.monthly_reset_at
    ? new Date(profile.monthly_reset_at)
    : null;

  if (resetAt && resetAt <= new Date()) {
    // Counter should have been reset by the DB trigger on update,
    // but if the user hasn't been updated since the reset date, treat as 0.
    return {
      allowed: true,
      tier,
      used: 0,
      limit: limits.verificationsPerMonth,
      remaining: limits.verificationsPerMonth,
    };
  }

  const remaining = Math.max(0, limits.verificationsPerMonth - used);

  if (remaining <= 0) {
    return {
      allowed: false,
      reason: `Monthly verification limit reached (${limits.verificationsPerMonth}/${limits.verificationsPerMonth}). Upgrade your plan for more verifications.`,
      tier,
      used,
      limit: limits.verificationsPerMonth,
      remaining: 0,
    };
  }

  return {
    allowed: true,
    tier,
    used,
    limit: limits.verificationsPerMonth,
    remaining,
  };
}

/**
 * Check if a file size is within the user's tier limit.
 */
export async function checkFileSizeLimit(
  userId: string,
  fileSizeBytes: number
): Promise<{ allowed: boolean; reason?: string; maxBytes: number }> {
  const supabase = await createServiceClient();

  const { data: profile } = await supabase
    .from("users")
    .select("subscription_tier")
    .eq("id", userId)
    .single();

  const tier = (profile?.subscription_tier || "free") as SubscriptionTier;
  const limits = TIER_LIMITS[tier];

  if (fileSizeBytes > limits.maxFileSizeBytes) {
    return {
      allowed: false,
      reason: `File size (${formatBytes(fileSizeBytes)}) exceeds your plan limit of ${limits.maxFileSizeLabel}. Upgrade to upload larger files.`,
      maxBytes: limits.maxFileSizeBytes,
    };
  }

  return {
    allowed: true,
    maxBytes: limits.maxFileSizeBytes,
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1)} GB`;
}
