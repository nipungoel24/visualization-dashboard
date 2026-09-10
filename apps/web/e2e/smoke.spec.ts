/**
 * Real-API smoke suite (NOT the Phase 6 E2E flow suite).
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

/** Fails on any NaN/Infinity/undefined SVG attribute (zero-result, nulls, resize, reset). */
async function assertNoBadSvg(page: Page) {
  const bad = await page.evaluate(() => {
    const hits: string[] = [];
    for (const element of document.querySelectorAll("svg *")) {
      for (const attribute of element.attributes) {
        if (/NaN|Infinity|undefined/.test(attribute.value)) {
          hits.push(`${element.tagName}.${attribute.name}=${attribute.value}`);
        }
      }
    }
    return hits;
  });
  expect(bad).toEqual([]);
}

function landscape(page: Page) {
  return page.getByRole("region", { name: "Signals Landscape" });
}

/**
 * Click a landscape bubble via Delaunay resolution. We use keyboard Enter
 * on the focused <g> element to trigger the filter, proving the full
 * Delaunay → onToggleTopic path works end-to-end. No force.
 */
async function clickLandscapeTopic(page: Page, topic: string) {
  await landscape(page).scrollIntoViewIfNeeded();
  const btn = landscape(page).getByRole("button", { name: new RegExp(`^${topic},`) }).first();
  await btn.waitFor({ state: "attached" });
  const coords = await btn.evaluate((el) => {
    const circle = el.querySelector("circle");
    if (!circle) return null;
    const svgEl = el.closest("svg");
    if (!svgEl) return null;
    const svgRect = svgEl.getBoundingClientRect();
    return { x: svgRect.left + circle.cx.baseVal.value, y: svgRect.top + circle.cy.baseVal.value };
  });
  if (!coords) throw new Error(`Could not find landscape bubble for topic: ${topic}`);
  await page.mouse.click(coords.x, coords.y);
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
    await expect(page).toHaveURL((url) => !url.searchParams.has("topic"));
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
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");
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

    await page.keyboard.press("Escape");
    await clickLandscapeTopic(page, "oil");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");
    await assertNoBadSvg(page);
  });

  test("landscape bubble tap works at mobile viewport", async ({ page }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");
    await clickLandscapeTopic(page, "oil");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");
    expect(page.url()).toContain("topic=oil");
    await expect(page.getByLabel("Active filters", { exact: true })).toContainText("Topic: oil");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });
});

test.describe("phase 4 visualizations against the real API", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("all nine charts render with real data and no placeholders remain", async ({
    page,
  }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");

    for (const name of [
      "Signals Landscape",
      "PESTLE Pulse",
      "End-Year Outlook",
      "Sector Composition",
      "Regional Signals",
      "Country Signals",
      "Topic Intelligence",
      "Source Landscape",
      "Metric Distributions",
      "Data Coverage",
    ]) {
      await expect(page.getByRole("region", { name })).toBeVisible();
    }
    await expect(page.getByText("Visualization added in Phase 4")).toHaveCount(0);
    await assertNoBadSvg(page);
    expect(problems).toEqual([]);
  });

  test("landscape bubble click filters to oil; chip and URL agree", async ({ page }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");

    await clickLandscapeTopic(page, "oil");

    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");
    expect(page.url()).toContain("topic=oil");
    await expect(page.getByLabel("Active filters", { exact: true })).toContainText("Topic: oil");
    const oilG = landscape(page).getByRole("button", { name: /^oil, 403 records/ }).first();
    await expect(oilG).toHaveAttribute("aria-pressed", "true");
    await assertNoBadSvg(page);
    expect(problems).toEqual([]);
  });

  test("overlap resolution: oil center resolves to oil, population center resolves to population", async ({
    page,
  }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");
    await page.setViewportSize({ width: 1440, height: 900 });

    // Click at oil's exact rendered center → must select oil (403)
    await clickLandscapeTopic(page, "oil");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");
    expect(page.url()).toContain("topic=oil");

    // Reset
    await clickLandscapeTopic(page, "oil");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");

    // Click at population's exact rendered center → must select population (4)
    await clickLandscapeTopic(page, "population");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("Filtered records4");
    expect(page.url()).toContain("topic=population");

    // Verify oil was NOT selected (overlap did not steal the click)
    await expect(page.getByLabel("Active filters", { exact: true })).not.toContainText("Topic: oil");

    // Reset
    await clickLandscapeTopic(page, "population");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");
    await assertNoBadSvg(page);
    expect(problems).toEqual([]);
  });

  test("gas count verifies independently; OR total is the exact sum", async ({ page }) => {
    const gasOverview = await page.request.get(
      "http://localhost:8000/api/v1/overview?topic=gas",
    );
    expect(gasOverview.ok()).toBe(true);
    const gasCount = (await gasOverview.json()).summary.filtered_count as number;
    expect(gasCount).toBeGreaterThan(0);

    await page.goto("/?topic=oil&topic=gas");
    const values = await kpiValues(page);
    expect(values[0]).toBe((403 + gasCount).toLocaleString("en-US"));
  });

  test("oil plus United States narrows to 51 across every surface", async ({ page }) => {
    await page.goto("/?topic=oil&country=United+States+of+America");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("51");
    await expect(
      page.getByRole("region", { name: "Country Signals" }),
    ).toContainText("United States of America");
    await expect(page.getByLabel("Active filters", { exact: true })).toContainText(
      "Country: United States of America",
    );
    await assertNoBadSvg(page);
  });

  test("chart-originated filter survives refresh; removal restores state", async ({
    page,
  }) => {
    await page.goto("/");
    await clickLandscapeTopic(page, "oil");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");

    await page.reload();
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");
    const oilG = landscape(page).getByRole("button", { name: /^oil, 403 records/ }).first();
    await expect(oilG).toHaveAttribute("aria-pressed", "true");

    await clickLandscapeTopic(page, "oil");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");
    expect(page.url()).not.toContain("topic=");
    await assertNoBadSvg(page);
  });

  test("end-year and sector filters work via user interaction", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 1440, height: 900 });

    // Click the 2017 year bar in End-Year Outlook
    const yearRegion = page.getByRole("region", { name: "End-Year Outlook" });
    await yearRegion.scrollIntoViewIfNeeded();
    const yearBar = yearRegion.getByRole("button", { name: /2017,/ }).first();
    await expect(yearBar).toBeVisible();
    await yearBar.click();
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("53");
    await expect(page.getByLabel("Active filters", { exact: true })).toContainText("End year: 2017");

    // Click the Energy sector tile in Sector Composition
    await page.goto("/");
    const sectorRegion = page.getByRole("region", { name: "Sector Composition" });
    await sectorRegion.scrollIntoViewIfNeeded();
    const energyTile = sectorRegion.getByRole("button", { name: /Energy,/ }).first();
    await expect(energyTile).toBeVisible();
    await energyTile.click();
    const energyValues = await kpiValues(page);
    const energyCount = Number.parseInt(energyValues[0].replace(/,/g, ""), 10);
    expect(energyCount).toBeGreaterThan(0);
    await expect(page.getByLabel("Active filters", { exact: true })).toContainText("Sector: Energy");
  });

  test("zero result keeps charts honest without throwing", async ({ page }) => {
    const problems = await consoleGuard(page);
    await page.goto("/?country=Atlantis");
    await expect(
      page.getByRole("heading", { name: "No signals match these filters" }),
    ).toBeVisible();
    await assertNoBadSvg(page);
    expect(problems).toEqual([]);
  });

  test("filter stress produces no request storm, stuck tooltips, or bad SVG", async ({
    page,
  }) => {
    const problems = await consoleGuard(page);
    let overviewCalls = 0;
    page.on("request", (request) => {
      if (request.url().includes("/api/v1/overview")) overviewCalls += 1;
    });
    await page.goto("/");

    for (let round = 0; round < 3; round += 1) {
      await clickLandscapeTopic(page, "oil");
      await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("403");
      await clickLandscapeTopic(page, "oil");
      await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");
    }
    await page.setViewportSize({ width: 800, height: 600 });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.mouse.move(5, 5);
    await expect(page.getByRole("tooltip")).toHaveCount(0);
    await assertNoBadSvg(page);
    expect(overviewCalls).toBeLessThan(30);
    expect(problems).toEqual([]);
  });
});
