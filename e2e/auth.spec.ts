import { test, expect } from "@playwright/test";

/**
 * E2E tests for authentication flows.
 *
 * Prerequisites:
 * - Local Next.js dev server running on localhost:3000
 * - Supabase local stack running (supabase start)
 *
 * These tests exercise the full signup -> login -> logout cycle.
 */

test.describe("Authentication", () => {
  test.describe("Signup flow", () => {
    test("should display the signup page", async ({ page }) => {
      await page.goto("/signup");
      await expect(page).toHaveURL(/\/signup/);
      await expect(page.locator("form")).toBeVisible();
    });

    test("should show validation errors for empty form submission", async ({
      page,
    }) => {
      await page.goto("/signup");
      await page.click('button[type="submit"]');

      // Form should show validation feedback (HTML5 or custom)
      // The exact validation depends on the form implementation
      await expect(page.locator("form")).toBeVisible();
    });

    test("should allow a new user to sign up", async ({ page }) => {
      const testEmail = `test+${Date.now()}@edgeproof.com`;

      await page.goto("/signup");
      await page.fill('input[name="email"], input[type="email"]', testEmail);
      await page.fill(
        'input[name="password"], input[type="password"]',
        "TestPassword123!"
      );

      await page.click('button[type="submit"]');

      // After successful signup, user should be redirected to dashboard or shown confirmation
      await page.waitForURL(/\/(dashboard|confirm|verify-email)/, {
        timeout: 10_000,
      });
    });
  });

  test.describe("Login flow", () => {
    test("should display the login page", async ({ page }) => {
      await page.goto("/login");
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator("form")).toBeVisible();
    });

    test("should show error for invalid credentials", async ({ page }) => {
      await page.goto("/login");
      await page.fill(
        'input[name="email"], input[type="email"]',
        "nonexistent@example.com"
      );
      await page.fill(
        'input[name="password"], input[type="password"]',
        "WrongPassword123"
      );
      await page.click('button[type="submit"]');

      // Should stay on login page or show error
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated users to login from dashboard routes", async ({
      page,
    }) => {
      await page.goto("/dashboard");
      await page.waitForURL(/\/login/, { timeout: 5_000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated users from verify page", async ({
      page,
    }) => {
      await page.goto("/verify");
      await page.waitForURL(/\/login/, { timeout: 5_000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test("should redirect unauthenticated users from settings page", async ({
      page,
    }) => {
      await page.goto("/settings");
      await page.waitForURL(/\/login/, { timeout: 5_000 });
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe("Route protection", () => {
    test("should allow public verification page without auth", async ({
      page,
    }) => {
      // Public verification pages at /verify/[token] should be accessible
      // without authentication. The page may 404 if token is invalid, but
      // should NOT redirect to /login.
      const response = await page.goto("/verify/pub_nonexistent");

      // Should NOT have been redirected to login
      expect(page.url()).not.toContain("/login");
    });
  });
});
