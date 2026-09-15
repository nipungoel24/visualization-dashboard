/**
 * Security header tests — verifies production hardening in next.config.ts.
 * Runs against the built Next.js server (same webServer setup as other E2E).
 */
import { expect, test } from "@playwright/test";

test.describe("production security headers", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("X-Powered-By header is not exposed", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).toBeTruthy();
    const poweredBy = response!.headers()["x-powered-by"];
    expect(poweredBy).toBeUndefined();
  });

  test("X-Content-Type-Options is nosniff", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).toBeTruthy();
    expect(response!.headers()["x-content-type-options"]).toBe("nosniff");
  });

  test("Referrer-Policy is strict-origin-when-cross-origin", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).toBeTruthy();
    expect(response!.headers()["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  });

  test("X-Frame-Options is DENY", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).toBeTruthy();
    expect(response!.headers()["x-frame-options"]).toBe("DENY");
  });

  test("Permissions-Policy disables unused browser features", async ({ page }) => {
    const response = await page.goto("/");
    expect(response).toBeTruthy();
    const pp = response!.headers()["permissions-policy"];
    expect(pp).toContain("camera=()");
    expect(pp).toContain("microphone=()");
    expect(pp).toContain("geolocation=()");
  });

  test("dashboard loads without regression after hardening", async ({ page }) => {
    const problems: string[] = [];
    page.on("pageerror", (error) => problems.push(error.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") problems.push(msg.text());
    });
    await page.goto("/");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");
    expect(problems).toEqual([]);
  });
});
