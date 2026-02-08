export const APP_NAME = "EdgeProof";
export const APP_TAGLINE = "The Carfax for Video Evidence";
export const APP_DESCRIPTION =
  "Verify the cryptographic authenticity of signed video files. Court-ready Certificates of Authenticity in seconds.";

export const ACCEPTED_FILE_TYPES = {
  "video/mp4": [".mp4"],
  "video/x-matroska": [".mkv"],
};

export const ACCEPTED_FILE_EXTENSIONS = [".mp4", ".mkv"];

export const POLLING_INTERVAL_MS = 2000;

export type SubscriptionTier = "free" | "professional" | "enterprise";

export const TIER_LIMITS = {
  free: {
    label: "Free",
    price: 0,
    verificationsPerMonth: 3,
    maxFileSizeBytes: 2 * 1024 * 1024 * 1024, // 2 GB
    maxFileSizeLabel: "2 GB",
    certificateType: "basic" as const,
    chainOfCustody: false,
    apiAccess: false,
    teamMembers: 1,
    auditRetentionDays: 30,
    archiveRetentionDays: 30,
    batchUpload: false,
    batchUploadLimit: 0,
    priorityProcessing: false,
    expertWitnessTemplate: false,
    sso: false,
  },
  professional: {
    label: "Pro",
    price: 99,
    verificationsPerMonth: 100,
    maxFileSizeBytes: 10 * 1024 * 1024 * 1024, // 10 GB
    maxFileSizeLabel: "10 GB",
    certificateType: "branded" as const,
    chainOfCustody: false,
    apiAccess: false,
    teamMembers: 1,
    auditRetentionDays: 365,
    archiveRetentionDays: 365,
    batchUpload: true,
    batchUploadLimit: 10,
    priorityProcessing: true,
    expertWitnessTemplate: false,
    sso: false,
  },
  enterprise: {
    label: "Enterprise",
    price: 499,
    verificationsPerMonth: Infinity,
    maxFileSizeBytes: 50 * 1024 * 1024 * 1024, // 50 GB
    maxFileSizeLabel: "50 GB",
    certificateType: "white-label" as const,
    chainOfCustody: true,
    apiAccess: true,
    teamMembers: 25,
    auditRetentionDays: Infinity,
    archiveRetentionDays: Infinity,
    batchUpload: true,
    batchUploadLimit: 100,
    priorityProcessing: true,
    expertWitnessTemplate: true,
    sso: true,
  },
} as const;

export const VERIFICATION_STATUSES = [
  "pending",
  "processing",
  "uploading",
  "authentic",
  "tampered",
  "unsigned",
  "inconclusive",
  "error",
] as const;

export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const TERMINAL_STATUSES: VerificationStatus[] = [
  "authentic",
  "tampered",
  "unsigned",
  "inconclusive",
  "error",
];

export const SIGNING_UUID = "5369676e-6564-2056-6964-656f2e2e2e30";
