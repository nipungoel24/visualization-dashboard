/**
 * Phase 5 closeout E2E against the real Phase 2 backend + MongoDB.
 * Covers paginated table, sorting, URL state, back/forward, focus
 * restoration, request isolation, error/empty, responsive QA, and
 * real-data workflow cross-checks.
 */
import { expect, test, type Page } from "@playwright/test";

const API = "http://localhost:8000";

async function consoleGuard(page: Page) {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning")
      problems.push(`${message.type()}: ${message.text()}`);
  });
  return problems;
}

function explorer(page: Page) {
  return page.getByRole("region", { name: "Records Explorer" });
}

function userCount(page: Page) {
  return page.getByLabel("Summary metrics", { exact: true });
}

// ---------------------------------------------------------------------------
// Desktop 1440×900
// ---------------------------------------------------------------------------
test.describe("records explorer 1440×900", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders paginated table with real data, no console errors, no overflow", async ({
    page,
  }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(
      region.getByText("1,000 matching", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      region.getByText("Page 1 of 40").filter({ visible: true }),
    ).toBeVisible();
    await expect(region.locator("table")).toBeVisible();
    // 25 data rows rendered
    await expect(region.locator("tbody tr")).toHaveCount(25);
    // Sort buttons present for all columns
    await expect(region.getByRole("button", { name: /Sort by/ })).toHaveCount(7);
    await expect(region.getByRole("button", { name: /Sorted by #/ })).toHaveCount(1);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("sorting updates the URL and reorders rows; toggle flips order", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();

    const firstTitleBefore = await region
      .locator("tbody tr")
      .first()
      .locator("td")
      .nth(1)
      .innerText();

    await region.getByRole("button", { name: "Sort by Topic" }).click();
    await expect(page).toHaveURL(/sort=topic/);
    await expect(
      region.getByRole("button", { name: /Sorted by Topic/ }),
    ).toBeAttached();

    // Second click toggles to desc
    await region.getByRole("button", { name: /Sorted by Topic/ }).click();
    await expect(page).toHaveURL(/sort=topic&order=desc/);

    const firstTitleAfter = await region
      .locator("tbody tr")
      .first()
      .locator("td")
      .nth(1)
      .innerText();
    expect(firstTitleAfter).not.toBe(firstTitleBefore);
  });

  test("sort change resets page to 1", async ({ page }) => {
    await page.goto("/?page=2");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(region.getByText("Page 2 of 40").filter({ visible: true })).toBeVisible();

    await region.getByRole("button", { name: "Sort by Topic" }).click();
    await expect(page).toHaveURL((url) => !url.searchParams.has("page"));
    await expect(region.getByText("Page 1 of 40").filter({ visible: true })).toBeVisible();
  });

  test("pagination navigates, persists in the URL, and steps back", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();

    await region.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(
      region.getByText("Page 2 of 40").filter({ visible: true }),
    ).toBeVisible();

    await region.getByRole("button", { name: "Previous page" }).click();
    await expect(page).toHaveURL((url) => !url.searchParams.has("page"));
    await expect(
      region.getByText("Page 1 of 40").filter({ visible: true }),
    ).toBeVisible();
  });

  test("filter change resets page to 1 and records total agrees with KPI", async ({
    page,
  }) => {
    await page.goto("/?page=2");
    await expect(userCount(page)).toContainText("1,000");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(region.getByText("Page 2 of 40").filter({ visible: true })).toBeVisible();

    await page.getByRole("button", { name: "Filter by Topic" }).click();
    await page.getByRole("combobox", { name: "Search Topic options" }).fill("oil");
    // Scope to popover content to avoid conflict with chart marks
    await page.locator('[data-radix-popper-content-wrapper]').getByRole("option", { name: "oil, 403 records" }).click();

    await expect(page).toHaveURL((url) => !url.searchParams.has("page"));
    await expect(userCount(page)).toContainText("403");
    await expect(
      region.getByText("Page 1 of 17").filter({ visible: true }),
    ).toBeVisible();
  });

  test("row click opens the detail sheet and mirrors the record URL param", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await region.getByRole("button", { name: /Open record/ }).first().click();

    const dialog = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/record=[0-9a-f]{64}/);

    await dialog.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL((url) => !url.searchParams.has("record"));
  });

  test("deep link with a record id restores the opened sheet", async ({ page }) => {
    const list = await page.request.get(`${API}/api/v1/records`);
    expect(list.ok()).toBe(true);
    const body = (await list.json()) as { items: { id: string }[] };
    const id = body.items[0].id;

    await page.goto(`/?record=${id}`);
    const dialog = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: /View original source/ }).first(),
    ).toBeAttached();
  });

  test("browser back/forward: drawer closes then reopens with filters intact", async ({
    page,
  }) => {
    // Start at a page with sort + page
    await page.goto("/?sort=topic&order=desc&page=2");
    await expect(
      page.getByRole("region", { name: "Records Explorer" })
        .getByText("Page 2 of 40").filter({ visible: true }),
    ).toBeVisible();

    // Open a record
    await explorer(page).getByRole("button", { name: /Open record/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/record=[0-9a-f]{64}/);

    // Back: drawer closes, filters/page/sort remain
    await page.goBack();
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/sort=topic&order=desc/);
    await expect(page).toHaveURL(/page=2/);
    await expect(page).toHaveURL((url) => !url.searchParams.has("record"));
    // Records still visible
    await expect(
      explorer(page).getByText("Page 2 of 40").filter({ visible: true }),
    ).toBeVisible();

    // Forward: same record reopens
    await page.goForward();
    await expect(page).toHaveURL(/record=[0-9a-f]{64}/);
    const dialogReopened = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialogReopened).toBeVisible();
  });

  test("keyboard Enter opens, Escape closes, focus returns to the trigger row", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();

    const firstRow = region.getByRole("button", { name: /Open record/ }).first();
    await firstRow.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/record=[0-9a-f]{64}/);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL((url) => !url.searchParams.has("record"));

    await expect
      .poll(() =>
        page.evaluate(
          () => document.activeElement?.getAttribute("aria-label") ?? "",
        ),
      )
      .toMatch(/^Open record/);
  });

  test("Close button also restores focus to the trigger row", async ({ page }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();

    const firstRow = region.getByRole("button", { name: /Open record/ }).first();
    await firstRow.focus();
    await firstRow.click();

    const dialog = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog).toBeVisible();

    await dialog.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog).toBeHidden();

    await expect
      .poll(() =>
        page.evaluate(
          () => document.activeElement?.getAttribute("aria-label") ?? "",
        ),
      )
      .toMatch(/^Open record/);
  });

  test("page/sort/order changes do NOT refetch overview or facets", async ({
    page,
  }) => {
    const overviewUrls: string[] = [];
    const facetsUrls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/v1/overview")) overviewUrls.push(url);
      if (url.includes("/api/v1/facets")) facetsUrls.push(url);
    });

    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(
      region.getByText("Page 1 of 40").filter({ visible: true }),
    ).toBeVisible();

    const overviewCountBefore = overviewUrls.length;
    const facetsCountBefore = facetsUrls.length;

    // Change page
    await region.getByRole("button", { name: "Next page" }).click();
    await expect(
      region.getByText("Page 2 of 40").filter({ visible: true }),
    ).toBeVisible();
    await page.waitForTimeout(500);

    // Change sort
    await region.getByRole("button", { name: "Sort by Topic" }).click();
    await expect(page).toHaveURL(/sort=topic/);
    await page.waitForTimeout(500);

    // Overview and facets should NOT have been re-requested
    expect(overviewUrls.length).toBe(overviewCountBefore);
    expect(facetsUrls.length).toBe(facetsCountBefore);
  });

  test("opening/closing a record does NOT refetch records list, overview, or facets", async ({
    page,
  }) => {
    const recordsUrls: string[] = [];
    const overviewUrls: string[] = [];
    const facetsUrls: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/api/v1/records") && !url.match(/\/records\/[0-9a-f]{64}/))
        recordsUrls.push(url);
      if (url.includes("/api/v1/overview")) overviewUrls.push(url);
      if (url.includes("/api/v1/facets")) facetsUrls.push(url);
    });

    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(
      region.getByText("Page 1 of 40").filter({ visible: true }),
    ).toBeVisible();

    const recordsCountBefore = recordsUrls.length;
    const overviewCountBefore = overviewUrls.length;
    const facetsCountBefore = facetsUrls.length;

    // Open first record
    await region.getByRole("button", { name: /Open record/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog).toBeVisible();
    await page.waitForTimeout(500);

    // Only the detail request should have been made
    expect(recordsUrls.length).toBe(recordsCountBefore);
    expect(overviewUrls.length).toBe(overviewCountBefore);
    expect(facetsUrls.length).toBe(facetsCountBefore);

    // Close record
    await dialog.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog).toBeHidden();
    await page.waitForTimeout(500);

    // No additional analytical requests
    expect(recordsUrls.length).toBe(recordsCountBefore);
    expect(overviewUrls.length).toBe(overviewCountBefore);
    expect(facetsUrls.length).toBe(facetsCountBefore);

    // Open another record
    await region.getByRole("button", { name: /Open record/ }).nth(1).click();
    const dialog2 = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog2).toBeVisible();
    await page.waitForTimeout(500);

    // Only the new detail request
    expect(recordsUrls.length).toBe(recordsCountBefore);
    expect(overviewUrls.length).toBe(overviewCountBefore);
    expect(facetsUrls.length).toBe(facetsCountBefore);

    // Close it
    await dialog2.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog2).toBeHidden();
  });

  test("zero-result filter shows the zero-results panel, not broken state", async ({
    page,
  }) => {
    await page.goto("/?topic=zzz_impossible_topic_zzz");
    // ZeroResults replaces the entire content area when filtered_count=0
    await expect(page.getByText("No signals match these filters")).toBeVisible();
    await expect(userCount(page)).toContainText("0");
  });

  test("records API failure shows explicit error with Retry button, KPIs intact", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(
      region.getByText("1,000 matching", { exact: true }).filter({ visible: true }),
    ).toBeVisible();

    // Intercept records endpoint and fail
    await page.route(
      new RegExp(`${API.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/api/v1/records`),
      (route) =>
        route.fulfill({ status: 500, body: '{"detail":"Internal Server Error"}' }),
    );
    // Trigger a records reload by changing page
    await region.getByRole("button", { name: "Next page" }).click();

    // Records shows explicit error (NOT zero-results copy)
    await expect(region.getByText("Records could not be loaded")).toBeVisible();
    await expect(region.getByRole("button", { name: "Retry" })).toBeVisible();
    // Dashboard context remains: KPI still shows data
    await expect(userCount(page)).toContainText("1,000");
  });

  test("records API failure: Retry button is accessible (keyboard + click)", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();

    // Fail records endpoint
    await page.route(
      new RegExp(`${API.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/api/v1/records`),
      (route) =>
        route.fulfill({ status: 500, body: '{"detail":"Internal Server Error"}' }),
    );
    // Trigger failure
    await region.getByRole("button", { name: "Next page" }).click();
    await expect(region.getByText("Records could not be loaded")).toBeVisible();
    const retryBtn = region.getByRole("button", { name: "Retry" });
    await expect(retryBtn).toBeVisible();

    // Retry button is keyboard accessible
    await retryBtn.focus();
    await expect(retryBtn).toBeFocused();
    // Click works without throwing
    await retryBtn.click();
    // KPI still intact
    await expect(userCount(page)).toContainText("1,000");
  });

  test("detail failure shows localized drawer error, dashboard intact", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();

    // Intercept the detail endpoint only (record ID is 64-char hex)
    await page.route(
      new RegExp(`${API.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}/api/v1/records/[0-9a-f]{64}`),
      (route) =>
        route.fulfill({ status: 404, body: '{"detail":"Not found"}' }),
    );

    await region.getByRole("button", { name: /Open record/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toBeVisible();
    // Dashboard context remains
    await expect(userCount(page)).toContainText("1,000");
    // Drawer can close
    await dialog.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog).toBeHidden();
  });
});

// ---------------------------------------------------------------------------
// Real-data workflow cross-checks
// ---------------------------------------------------------------------------
test.describe("real workflow cross-checks", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("unfiltered: KPI 1000, records 1000, page size 25, total pages 40", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(userCount(page)).toContainText("1,000");
    await expect(
      region.getByText("1,000 matching", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      region.getByText("Page 1 of 40").filter({ visible: true }),
    ).toBeVisible();
    await expect(region.locator("tbody tr")).toHaveCount(25);
  });

  test("topic=oil: KPI 403, records 403, 17 pages", async ({ page }) => {
    await page.goto("/?topic=oil");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(userCount(page)).toContainText("403");
    await expect(
      region.getByText("403 matching", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      region.getByText("Page 1 of 17").filter({ visible: true }),
    ).toBeVisible();
  });

  test("topic=oil&country=USA: KPI 51, records 51, 3 pages", async ({ page }) => {
    await page.goto(
      "/?topic=oil&country=United%20States%20of%20America",
    );
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(userCount(page)).toContainText("51");
    await expect(
      region.getByText("51 matching", { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(
      region.getByText("Page 1 of 3").filter({ visible: true }),
    ).toBeVisible();
  });

  test("detail drawer shows real record fields matching the API", async ({
    page,
  }) => {
    const res = await page.request.get(`${API}/api/v1/records`);
    expect(res.ok()).toBe(true);
    const body = (await res.json()) as {
      items: { id: string; title: string; topic: string; source: string; url: string }[];
    };
    const apiRecord = body.items[0];

    await page.goto(`/?record=${apiRecord.id}`);
    const dialog = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(apiRecord.title);
    await expect(dialog).toContainText(apiRecord.topic);
    if (apiRecord.source) {
      await expect(dialog).toContainText(apiRecord.source);
    }
    if (apiRecord.url && apiRecord.url.startsWith("http")) {
      await expect(
        dialog.getByRole("link", { name: /View original source/ }).first(),
      ).toBeAttached();
    }
  });
});

// ---------------------------------------------------------------------------
// Mobile 390×844
// ---------------------------------------------------------------------------
test.describe("records explorer 390×844", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows card list, not table; paginates; detail Sheet usable; no overflow", async ({
    page,
  }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();

    await expect(region.locator("table")).toBeHidden();
    await expect(
      region.getByRole("button", { name: /Open record/ }).first(),
    ).toBeVisible();

    // Pagination
    await region.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(
      region.getByText("Page 2 of 40").filter({ visible: true }),
    ).toBeVisible();

    // Detail Sheet usable
    await region.getByRole("button", { name: /Open record/ }).first().click();
    const dialog = page.getByRole("dialog", { name: "Record detail" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Close panel" }).click();
    await expect(dialog).toBeHidden();

    // No document-level overflow
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Narrow desktop 1024×768
// ---------------------------------------------------------------------------
test.describe("records explorer 1024×768", () => {
  test.use({ viewport: { width: 1024, height: 768 } });

  test("table renders, sorting and pagination usable, no document overflow", async ({
    page,
  }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();

    await expect(region.locator("table")).toBeVisible();
    await expect(
      region.getByText("Page 1 of 40").filter({ visible: true }),
    ).toBeVisible();

    // Sorting usable
    await region.getByRole("button", { name: "Sort by Topic" }).click();
    await expect(page).toHaveURL(/sort=topic/);

    // Pagination usable
    await region.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);

    // No document overflow
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Three-viewport horizontal overflow audit (required targets)
// ---------------------------------------------------------------------------
test("no document-level horizontal overflow at all required viewports", async ({
  page,
}) => {
  const viewports = [
    { width: 1440, height: 900 },
    { width: 1024, height: 768 },
    { width: 390, height: 844 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page
        .getByRole("region", { name: "Records Explorer" })
        .getByText("matching")
        .first(),
    ).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(
      overflow,
      `document overflows at ${viewport.width}x${viewport.height}`,
    ).toBeLessThanOrEqual(1);
  }
});

// ---------------------------------------------------------------------------
// Data integrity quick-check
// ---------------------------------------------------------------------------
test("data integrity: Mongo 1000 total records", async ({ page }) => {
  const res = await page.request.get(`${API}/api/v1/records?page_size=1`);
  expect(res.ok()).toBe(true);
  const body = (await res.json()) as { total: number };
  expect(body.total).toBe(1000);
});
