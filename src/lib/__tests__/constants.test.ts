import { describe, it, expect } from "vitest";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_DESCRIPTION,
  ACCEPTED_FILE_TYPES,
  ACCEPTED_FILE_EXTENSIONS,
  POLLING_INTERVAL_MS,
  TIER_LIMITS,
  VERIFICATION_STATUSES,
  TERMINAL_STATUSES,
  SIGNING_UUID,
  type SubscriptionTier,
  type VerificationStatus,
} from "@/lib/constants";

describe("APP constants", () => {
  it("should define the app name", () => {
    expect(APP_NAME).toBe("EdgeProof");
  });

  it("should define the tagline", () => {
    expect(APP_TAGLINE).toBe("The Carfax for Video Evidence");
  });

  it("should define a non-empty description", () => {
    expect(APP_DESCRIPTION).toBeTruthy();
    expect(APP_DESCRIPTION.length).toBeGreaterThan(20);
  });
});

describe("ACCEPTED_FILE_TYPES", () => {
  it("should accept MP4 files", () => {
    expect(ACCEPTED_FILE_TYPES["video/mp4"]).toEqual([".mp4"]);
  });

  it("should accept MKV files", () => {
    expect(ACCEPTED_FILE_TYPES["video/x-matroska"]).toEqual([".mkv"]);
  });

  it("should only support MP4 and MKV", () => {
    const keys = Object.keys(ACCEPTED_FILE_TYPES);
    expect(keys).toHaveLength(2);
    expect(keys).toContain("video/mp4");
    expect(keys).toContain("video/x-matroska");
  });
});

describe("ACCEPTED_FILE_EXTENSIONS", () => {
  it("should list .mp4 and .mkv", () => {
    expect(ACCEPTED_FILE_EXTENSIONS).toEqual([".mp4", ".mkv"]);
  });
});

describe("POLLING_INTERVAL_MS", () => {
  it("should be 2000ms (2 seconds)", () => {
    expect(POLLING_INTERVAL_MS).toBe(2000);
  });
});

describe("SIGNING_UUID", () => {
  it("should match the Axis signed video SEI NALU UUID", () => {
    expect(SIGNING_UUID).toBe("5369676e-6564-2056-6964-656f2e2e2e30");
  });

  it("should be a valid UUID format", () => {
    expect(SIGNING_UUID).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });
});

describe("VERIFICATION_STATUSES", () => {
  it("should include all expected statuses", () => {
    const expected = [
      "pending",
      "processing",
      "uploading",
      "authentic",
      "tampered",
      "unsigned",
      "inconclusive",
      "error",
    ];
    expect([...VERIFICATION_STATUSES]).toEqual(expected);
  });

  it("should have 8 statuses", () => {
    expect(VERIFICATION_STATUSES).toHaveLength(8);
  });
});

describe("TERMINAL_STATUSES", () => {
  it("should include all terminal verification statuses", () => {
    expect(TERMINAL_STATUSES).toContain("authentic");
    expect(TERMINAL_STATUSES).toContain("tampered");
    expect(TERMINAL_STATUSES).toContain("unsigned");
    expect(TERMINAL_STATUSES).toContain("inconclusive");
    expect(TERMINAL_STATUSES).toContain("error");
  });

  it("should not include non-terminal statuses", () => {
    expect(TERMINAL_STATUSES).not.toContain("pending");
    expect(TERMINAL_STATUSES).not.toContain("processing");
    expect(TERMINAL_STATUSES).not.toContain("uploading");
  });

  it("should have 5 terminal statuses", () => {
    expect(TERMINAL_STATUSES).toHaveLength(5);
  });

  it("should be a subset of VERIFICATION_STATUSES", () => {
    for (const status of TERMINAL_STATUSES) {
      expect(VERIFICATION_STATUSES).toContain(status);
    }
  });
});

describe("TIER_LIMITS", () => {
  describe("Free tier", () => {
    const free = TIER_LIMITS.free;

    it("should have correct label and price", () => {
      expect(free.label).toBe("Free");
      expect(free.price).toBe(0);
    });

    it("should limit to 3 verifications per month", () => {
      expect(free.verificationsPerMonth).toBe(3);
    });

    it("should limit file size to 2 GB", () => {
      expect(free.maxFileSizeBytes).toBe(2 * 1024 * 1024 * 1024);
      expect(free.maxFileSizeLabel).toBe("2 GB");
    });

    it("should have basic certificate type", () => {
      expect(free.certificateType).toBe("basic");
    });

    it("should not include premium features", () => {
      expect(free.chainOfCustody).toBe(false);
      expect(free.apiAccess).toBe(false);
      expect(free.batchUpload).toBe(false);
      expect(free.priorityProcessing).toBe(false);
      expect(free.expertWitnessTemplate).toBe(false);
      expect(free.sso).toBe(false);
    });

    it("should allow only 1 team member", () => {
      expect(free.teamMembers).toBe(1);
    });

    it("should have 30-day retention", () => {
      expect(free.auditRetentionDays).toBe(30);
      expect(free.archiveRetentionDays).toBe(30);
    });
  });

  describe("Professional tier", () => {
    const pro = TIER_LIMITS.professional;

    it("should have correct label and price", () => {
      expect(pro.label).toBe("Pro");
      expect(pro.price).toBe(99);
    });

    it("should allow 100 verifications per month", () => {
      expect(pro.verificationsPerMonth).toBe(100);
    });

    it("should limit file size to 10 GB", () => {
      expect(pro.maxFileSizeBytes).toBe(10 * 1024 * 1024 * 1024);
      expect(pro.maxFileSizeLabel).toBe("10 GB");
    });

    it("should have branded certificate type", () => {
      expect(pro.certificateType).toBe("branded");
    });

    it("should support batch upload of up to 10 files", () => {
      expect(pro.batchUpload).toBe(true);
      expect(pro.batchUploadLimit).toBe(10);
    });

    it("should include priority processing", () => {
      expect(pro.priorityProcessing).toBe(true);
    });

    it("should not include enterprise-only features", () => {
      expect(pro.chainOfCustody).toBe(false);
      expect(pro.apiAccess).toBe(false);
      expect(pro.expertWitnessTemplate).toBe(false);
      expect(pro.sso).toBe(false);
    });

    it("should have 365-day retention", () => {
      expect(pro.auditRetentionDays).toBe(365);
      expect(pro.archiveRetentionDays).toBe(365);
    });
  });

  describe("Enterprise tier", () => {
    const enterprise = TIER_LIMITS.enterprise;

    it("should have correct label and price", () => {
      expect(enterprise.label).toBe("Enterprise");
      expect(enterprise.price).toBe(499);
    });

    it("should allow unlimited verifications", () => {
      expect(enterprise.verificationsPerMonth).toBe(Infinity);
    });

    it("should limit file size to 50 GB", () => {
      expect(enterprise.maxFileSizeBytes).toBe(50 * 1024 * 1024 * 1024);
      expect(enterprise.maxFileSizeLabel).toBe("50 GB");
    });

    it("should have white-label certificate type", () => {
      expect(enterprise.certificateType).toBe("white-label");
    });

    it("should include all premium features", () => {
      expect(enterprise.chainOfCustody).toBe(true);
      expect(enterprise.apiAccess).toBe(true);
      expect(enterprise.batchUpload).toBe(true);
      expect(enterprise.priorityProcessing).toBe(true);
      expect(enterprise.expertWitnessTemplate).toBe(true);
      expect(enterprise.sso).toBe(true);
    });

    it("should support batch upload of up to 100 files", () => {
      expect(enterprise.batchUploadLimit).toBe(100);
    });

    it("should allow 25 team members", () => {
      expect(enterprise.teamMembers).toBe(25);
    });

    it("should have unlimited retention", () => {
      expect(enterprise.auditRetentionDays).toBe(Infinity);
      expect(enterprise.archiveRetentionDays).toBe(Infinity);
    });
  });

  describe("Tier hierarchy", () => {
    it("should have increasing file size limits across tiers", () => {
      expect(TIER_LIMITS.free.maxFileSizeBytes).toBeLessThan(
        TIER_LIMITS.professional.maxFileSizeBytes
      );
      expect(TIER_LIMITS.professional.maxFileSizeBytes).toBeLessThan(
        TIER_LIMITS.enterprise.maxFileSizeBytes
      );
    });

    it("should have increasing verification limits across tiers", () => {
      expect(TIER_LIMITS.free.verificationsPerMonth).toBeLessThan(
        TIER_LIMITS.professional.verificationsPerMonth
      );
      expect(TIER_LIMITS.professional.verificationsPerMonth).toBeLessThan(
        TIER_LIMITS.enterprise.verificationsPerMonth
      );
    });

    it("should have increasing prices across tiers", () => {
      expect(TIER_LIMITS.free.price).toBeLessThan(TIER_LIMITS.professional.price);
      expect(TIER_LIMITS.professional.price).toBeLessThan(TIER_LIMITS.enterprise.price);
    });
  });
});
