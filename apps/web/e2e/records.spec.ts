/**
 * Phase 5 records-explorer E2E against the real Phase 2 backend + MongoDB.
 * Covers the paginated table, server-side sorting, URL-state persistence,
 * page-reset-on-filter, record detail (URL `record=` param), and the mobile
 * card-list adaptation.
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

function explorer(page: Page) {
  return page.getByRole("region", { name: "Records Explorer" });
}

test.describe("records explorer against the real API", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("renders the paginated table with real data and no console errors", async ({
    page,
  }) => {
    const problems = await consoleGuard(page);
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(region.getByText("1,000 matching", { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(region.getByText("Page 1 of 40").filter({ visible: true })).toBeVisible();
    await expect(region.locator("table")).toBeVisible();
    await expect(
      region.getByRole("button", { name: /Open record/ }).first(),
    ).toBeAttached();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });

  test("sorting updates the URL and reorders rows; a second click flips order", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();

    const titleCell = region.locator("tbody tr").first().locator("td").nth(1);
    await expect(titleCell).toBeAttached();
    const firstTitle = (await titleCell.innerText()).trim();

    await region.getByRole("button", { name: "Sort by Topic" }).click();
    await expect(page).toHaveURL(/sort=topic/);
    await expect(region.getByRole("button", { name: /Sorted by Topic/ })).toBeAttached();

    await region.getByRole("button", { name: /Sorted by Topic/ }).click();
    await expect(page).toHaveURL(/sort=topic&order=desc/);

    const secondTitle = (await region.locator("tbody tr").first().locator("td").nth(1).innerText()).trim();
    expect(secondTitle).not.toBe(firstTitle);
  });

  test("pagination navigates, persists in the URL, and steps back", async ({
    page,
  }) => {
    await page.goto("/");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(region.getByText("Page 1 of 40").filter({ visible: true })).toBeVisible();

    await region.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(region.getByText("Page 2 of 40").filter({ visible: true })).toBeVisible();

    await region.getByRole("button", { name: "Previous page" }).click();
    await expect(page).toHaveURL((url) => !url.searchParams.has("page"));
    await expect(region.getByText("Page 1 of 40").filter({ visible: true })).toBeVisible();
  });

  test("a filter change resets pagination back to page 1", async ({ page }) => {
    await page.goto("/?page=2");
    await expect(page.getByLabel("Summary metrics", { exact: true })).toContainText("1,000");
    const region = explorer(page);
    await region.scrollIntoViewIfNeeded();
    await expect(region.getByText("Page 2 of 40").filter({ visible: true })).toBeVisible();

    await page.getByRole("button", { name: "Filter by Topic" }).click();
    await page.getByRole("combobox", { name: "Search Topic options" }).fill("oil");
    await page.getByRole("option", { name: "oil, 403 records" }).click();

    await expect(page).toHaveURL((url) => !url.searchParams.has("page"));
    await expect(userCount(page)).toContainText("403");
    await expect(region.getByText("Page 1 of 17").filter({ visible: true })).toBeVisible();
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
    const list = await page.request.get("http://localhost:8000/api/v1/records");
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

  test("keyboard-only flow: Enter opens, Escape closes, focus returns to the row", async ({
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
});

function userCount(page: Page) {
  return page.getByLabel("Summary metrics", { exact: true });
}

test.describe("records explorer on mobile", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("shows the card list instead of the table; paginates; no horizontal overflow", async ({
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

    await region.getByRole("button", { name: "Next page" }).click();
    await expect(page).toHaveURL(/page=2/);
    await expect(region.getByText("Page 2 of 40").filter({ visible: true })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
    expect(problems).toEqual([]);
  });
});

test("no document-level horizontal scroll at mobile, tablet, and narrow-desktop widths", async ({
  page,
}) => {
  const viewports = [
    { width: 360, height: 740 },
    { width: 834, height: 1112 },
    { width: 1024, height: 768 },
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(
      page.getByRole("region", { name: "Records Explorer" }).getByText("matching").first(),
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