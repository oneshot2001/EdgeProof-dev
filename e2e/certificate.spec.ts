import { test, expect } from "@playwright/test";

/**
 * E2E tests for certificate download and public verification pages.
 *
 * Prerequisites:
 * - Local Next.js dev server running on localhost:3000
 * - Supabase local stack running
 */

async function loginTestUser(page: import("@playwright/test").Page) {
  await page.goto("/login");
  await page.fill(
    'input[name="email"], input[type="email"]',
    process.env.TEST_USER_EMAIL || "demo@edgeproof.com"
  );
  await page.fill(
    'input[name="password"], input[type="password"]',
    process.env.TEST_USER_PASSWORD || "TestPassword123!"
  );
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 });
}

test.describe("Certificate download", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_SKIP_AUTH) {
      await loginTestUser(page);
    }
  });

  test("should return 404 for non-existent certificate", async ({ page }) => {
    const response = await page.goto("/api/certificates/nonexistent-id/pdf");
    // Should return 401 (unauthorized) or 404 depending on auth state
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });

  test("certificates page should be accessible", async ({ page }) => {
    await page.goto("/certificates");
    await expect(page.locator("body")).toBeVisible();
  });
});

test.describe("Public verification page", () => {
  test("should return 404 for non-existent public token", async ({ page }) => {
    const response = await page.goto(
      "/api/public/verify/nonexistent_token_12345"
    );
    expect(response?.status()).toBe(404);
  });

  test("should not redirect to login for public verification API", async ({
    page,
  }) => {
    // Public verification endpoints should be accessible without authentication
    const response = await page.goto("/api/public/verify/pub_test123");

    // Should get a JSON response (404 for invalid token), not a redirect to login
    expect(page.url()).not.toContain("/login");
    expect(response?.status()).toBe(404);
  });

  test("public verify page should render without auth", async ({ page }) => {
    // The /verify/[token] page (frontend) should render without authentication.
    // It may show "not found" for invalid tokens, but should not redirect.
    await page.goto("/verify/pub_fake_token");

    // Should NOT redirect to login
    expect(page.url()).not.toContain("/login");
    await expect(page.locator("body")).toBeVisible();
  });
});
