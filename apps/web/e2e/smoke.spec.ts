/**
 * Phase 3 real-API smoke suite (NOT the Phase 6 E2E flow suite).
 * Runs the dashboard against the live Phase 2 backend + MongoDB and proves
 * the interactive filter flows with real data. No mocks.
 */
import { expect, test, type Page } from "@playwright/test";

async function consoleGuard(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") problems.push(`console: ${message.text()}`);
  });
  return problems;
}

async function kpiValues(page: Page): Promise<string[]> {
  const strip = page.getByLabel("Summary metrics", { exact: true });
  await expect(strip).toBeVisible();
  // Each KPI cell holds a label <p> followed by its value <p>.
  return strip.locator("div > p + p").allTextContents();
}

test.describe("dashboard smoke against the real API", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("loads with 1,000 unfiltered records and no console errors", async ({ page }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");
    const values = await kpiValues(page);
    expect(values[0]).toBe("1,000");
    expect(page.url()).not.toContain("topic=");
    expect(problems).toEqual([]);
  });

  test("topic oil → 403, plus gas → 492 (OR), chips + URL update", async ({ page }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");

    await page.getByRole("button", { name: "Filter by Topic" }).click();
    await page.getByRole("combobox", { name: "Search Topic options" }).fill("oil");
    const facetsSettled = page.waitForResponse(
      (response) => response.url().includes("/api/v1/facets") && response.ok(),
    );
    await page.getByRole("option", { name: "oil, 403 records" }).click();
    await facetsSettled;
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");
    expect(page.url()).toContain("topic=oil");
    await expect(page.getByLabel("Active filters", { exact: true })).toContainText("Topic: oil");

    // The multi-select popover stays open after a pick, so a second value is
    // selected without reopening.
    await page.getByRole("combobox", { name: "Search Topic options" }).fill("gas");
    const gasOption = page.getByRole("option", { name: "gas, 89 records" });
    await expect(gasOption).toBeVisible();
    await gasOption.click();
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("492");
    expect(page.url()).toContain("topic=gas");
    expect(problems).toEqual([]);
  });

  test("country filter narrows across dimensions (AND) with removable chips", async ({
    page,
  }) => {
    await page.goto("/?topic=oil");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");

    await page.getByRole("button", { name: "Filter by Country" }).click();
    await page
      .getByRole("combobox", { name: "Search Country options" })
      .fill("United States of America");
    await page.getByRole("option", { name: /United States of America, 51 records/ }).click();
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("51");
    expect(page.url()).toContain("country=United+States+of+America");

    await page.getByRole("button", { name: "Remove filter Topic: oil" }).click();
    await expect(page).toHaveURL(/country=/);
    expect(page.url()).not.toContain("topic=oil");
  });

  test("refresh restores filter state; reset returns to 1,000", async ({ page }) => {
    await page.goto("/?topic=oil&topic=gas");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("492");

    await page.reload();
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("492");
    await expect(page.getByLabel("Active filters", { exact: true })).toContainText("Topic: oil");

    await page.getByRole("button", { name: /Reset filters \(2\)/ }).first().click();
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");
    expect(page.url()).not.toContain("topic=");
  });

  test("zero-result filter shows the intentional empty state", async ({ page }) => {
    await page.goto("/?country=Atlantis");
    await expect(
      page.getByRole("heading", { name: "No signals match these filters" }),
    ).toBeVisible();
    const values = await kpiValues(page);
    expect(values[0]).toBe("0");
    expect(values[1]).toBe("—");

    await page.getByRole("button", { name: "Reset filters", exact: true }).click();
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");
  });

  test("API outage renders an error, never an empty-looking dataset", async ({ page }) => {
    await page.route("**/api/v1/overview**", (route) => route.abort());
    await page.route("**/api/v1/facets**", (route) => route.abort());
    await page.goto("/");
    await expect(page.getByRole("alert").first()).toContainText(
      "could not reach the data service",
    );
    const values = await kpiValues(page).catch(() => null);
    if (values) expect(values[0]).not.toBe("0");
  });

  test("1024×768 keeps the rail with no document overflow", async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto("/");
    await expect(page.getByRole("complementary", { name: "Dashboard filters" })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

test.describe("mobile dashboard", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("rail becomes a sheet; filters work; no horizontal overflow", async ({ page }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");
    await expect(
      page.getByRole("complementary", { name: "Dashboard filters" }),
    ).toBeHidden();

    const trigger = page.getByRole("button", { name: "Open filters" });
    await expect(trigger).toBeVisible();
    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Filters" });
    await expect(sheet).toBeVisible();

    await sheet.getByRole("button", { name: "Filter by Topic" }).click();
    await page.getByRole("combobox", { name: "Search Topic options" }).fill("oil");
    await page.getByRole("option", { name: "oil, 403 records" }).click();
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");

    // Layered dismissal: each Escape dismisses the topmost layer. The waits let
    // each layer's exit animation finish so the next Escape reaches the layer below.
    await page.keyboard.press("Escape");
    await expect(page.getByRole("combobox", { name: "Search Topic options" })).toBeHidden();
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("reduced motion keeps every interaction working", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.getByRole("button", { name: "Open filters" }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");
  });
});
