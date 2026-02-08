export type UserRole = "viewer" | "verifier" | "admin" | "owner";
export type SubscriptionTier = "free" | "professional" | "enterprise";
export type VerificationStatus =
  | "pending"
  | "processing"
  | "uploading"
  | "authentic"
  | "tampered"
  | "unsigned"
  | "inconclusive"
  | "error";
export type AuditAction =
  | "uploaded"
  | "verified"
  | "viewed"
  | "downloaded_pdf"
  | "downloaded_video"
  | "shared"
  | "exported_audit";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  company: string | null;
  role: UserRole;
  team_id: string | null;
  subscription_tier: SubscriptionTier;
  stripe_customer_id: string | null;
  monthly_verifications: number;
  monthly_reset_at: string;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  subscription_tier: SubscriptionTier;
  stripe_subscription_id: string | null;
  max_members: number;
  white_label_config: WhiteLabelConfig | null;
  created_at: string;
}

export interface WhiteLabelConfig {
  logo_url?: string;
  primary_color?: string;
  company_name?: string;
}

export interface Verification {
  id: string;
  user_id: string;
  team_id: string | null;
  status: VerificationStatus;
  file_name: string;
  file_size_bytes: number;
  file_hash_sha256: string;
  file_storage_path: string | null;
  device_serial: string | null;
  device_model: string | null;
  device_firmware: string | null;
  device_hardware_id: string | null;
  cert_chain_valid: boolean | null;
  cert_intermediate: string | null;
  cert_root: string | null;
  total_gops: number | null;
  verified_gops: number | null;
  tampered_gops: number | null;
  total_frames: number | null;
  verified_frames: number | null;
  tampered_frames: number | null;
  recording_start: string | null;
  recording_end: string | null;
  recording_duration_seconds: number | null;
  gaps_detected: number;
  attestation_valid: boolean | null;
  attestation_details: Record<string, unknown> | null;
  worker_response: Record<string, unknown> | null;
  certificate_url: string | null;
  certificate_hash: string | null;
  public_token: string | null;
  is_public: boolean;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLogEntry {
  id: string;
  verification_id: string;
  user_id: string | null;
  action: AuditAction;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  team_id: string | null;
  key_hash: string;
  key_prefix: string;
  name: string;
  permissions: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

// Supabase-style database type for type-safe queries
export interface Database {
  public: {
    Tables: {
      users: {
        Row: User;
        Insert: Omit<User, "created_at" | "updated_at" | "monthly_verifications" | "monthly_reset_at"> & {
          monthly_verifications?: number;
          monthly_reset_at?: string;
        };
        Update: Partial<Omit<User, "id">>;
      };
      teams: {
        Row: Team;
        Insert: Omit<Team, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<Team, "id">>;
      };
      verifications: {
        Row: Verification;
        Insert: Omit<Verification, "id" | "created_at" | "updated_at" | "gaps_detected" | "is_public"> & {
          id?: string;
          gaps_detected?: number;
          is_public?: boolean;
        };
        Update: Partial<Omit<Verification, "id">>;
      };
      audit_log: {
        Row: AuditLogEntry;
        Insert: Omit<AuditLogEntry, "id" | "created_at"> & { id?: string };
        Update: Partial<Omit<AuditLogEntry, "id">>;
      };
      api_keys: {
        Row: ApiKey;
        Insert: Omit<ApiKey, "id" | "created_at" | "revoked"> & {
          id?: string;
          revoked?: boolean;
        };
        Update: Partial<Omit<ApiKey, "id">>;
      };
    };
    Enums: {
      user_role: UserRole;
      subscription_tier: SubscriptionTier;
      verification_status: VerificationStatus;
      audit_action: AuditAction;
    };
  };
}
