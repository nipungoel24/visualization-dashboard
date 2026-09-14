import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "tablet", width: 1024, height: 768 },
  { name: "mobile", width: 390, height: 844 },
] as const;

for (const viewport of VIEWPORTS) {
  test.describe(`accessibility @ ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("default dashboard", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Summary metrics", { exact: true }).waitFor({ state: "visible" });
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
    });

    test("filtered dashboard (topic=oil)", async ({ page }) => {
      await page.goto("/?topic=oil");
      await page.getByLabel("Summary metrics", { exact: true }).waitFor({ state: "visible" });
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
    });

    test("Records Explorer", async ({ page }) => {
      await page.goto("/");
      const explorer = page.getByRole("region", { name: "Records Explorer" });
      await explorer.scrollIntoViewIfNeeded();
      await expect(explorer.getByText("matching").first()).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
    });

    test("Record Detail Sheet open", async ({ page }) => {
      await page.goto("/");
      const explorer = page.getByRole("region", { name: "Records Explorer" });
      await explorer.scrollIntoViewIfNeeded();
      await explorer.getByRole("button", { name: /Open record/ }).first().click();
      await expect(page.getByRole("dialog", { name: "Record detail" })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
    });

    test("Zero-result state", async ({ page }) => {
      await page.goto("/?country=Atlantis");
      await expect(page.getByRole("heading", { name: "No signals match these filters" })).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
    });

    test("Records API error state", async ({ page }) => {
      await page.route("**/api/v1/records**", (route) =>
        route.fulfill({ status: 500, body: '{"detail":"Internal Server Error"}' })
      );
      await page.goto("/");
      const explorer = page.getByRole("region", { name: "Records Explorer" });
      await explorer.scrollIntoViewIfNeeded();
      // Trigger error by navigating to a page that requires records fetch
      // The error state should appear without needing to click "Next page"
      await page.waitForTimeout(500);
      await expect(explorer.getByText("Records could not be loaded")).toBeVisible({ timeout: 10000 });
      const results = await new AxeBuilder({ page }).analyze();
      expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
    });
  });
}

test.describe("mobile filter sheet accessibility", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("mobile filter sheet open", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open filters" }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
  });
});