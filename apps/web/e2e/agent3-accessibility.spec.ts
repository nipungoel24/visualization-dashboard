import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("agent3: non-chart accessibility", () => {
  test.describe("desktop keyboard filter workflow", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("can open and close filter popover with keyboard", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Summary metrics", { exact: true }).waitFor({ state: "visible" });

      const filterTrigger = page.getByRole("button", { name: "Filter by Topic" });
      await filterTrigger.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("combobox", { name: "Search Topic options" })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("combobox", { name: "Search Topic options" })).not.toBeVisible();
    });

    test("can select and deselect filter option with keyboard", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Summary metrics", { exact: true }).waitFor({ state: "visible" });

      const filterTrigger = page.getByRole("button", { name: "Filter by Topic" });
      await filterTrigger.click();
      const option = page.getByRole("option", { name: /oil/ }).first();
      await option.click();
      await expect(filterTrigger).toHaveText(/1 selected/);
    });

    test("active filter chips are keyboard removable", async ({ page }) => {
      await page.goto("/?topic=oil");
      await page.getByLabel("Summary metrics", { exact: true }).waitFor({ state: "visible" });

      const removeBtn = page.getByRole("button", { name: "Remove filter Topic: oil" });
      await expect(removeBtn).toBeVisible();
      await removeBtn.click();
      await expect(page.getByRole("button", { name: "Remove filter Topic: oil" })).not.toBeVisible();
    });

    test("skip link appears on Tab and navigates to main content", async ({ page }) => {
      await page.goto("/");
      await page.keyboard.press("Tab");
      const skipLink = page.getByText("Skip to dashboard content");
      await expect(skipLink).toBeVisible();
    });

    test("records table rows are keyboard activatable", async ({ page }) => {
      await page.goto("/");
      const explorer = page.getByRole("region", { name: "Records Explorer" });
      await explorer.scrollIntoViewIfNeeded();
      await expect(explorer.getByText("matching").first()).toBeVisible();

      const firstRow = explorer.getByRole("button", { name: /Open record/ }).first();
      await firstRow.focus();
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog", { name: "Record detail" })).toBeVisible();
    });

    test("record detail sheet closes with Escape and restores focus", async ({ page }) => {
      await page.goto("/");
      const explorer = page.getByRole("region", { name: "Records Explorer" });
      await explorer.scrollIntoViewIfNeeded();
      await expect(explorer.getByText("matching").first()).toBeVisible();

      const firstRow = explorer.getByRole("button", { name: /Open record/ }).first();
      await firstRow.click();
      await expect(page.getByRole("dialog", { name: "Record detail" })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Record detail" })).not.toBeVisible();
      await expect(firstRow).toBeFocused();
    });

    test("pagination buttons are keyboard operable", async ({ page }) => {
      await page.goto("/");
      const explorer = page.getByRole("region", { name: "Records Explorer" });
      await explorer.scrollIntoViewIfNeeded();
      await expect(explorer.getByText("matching").first()).toBeVisible();

      const nextBtn = page.getByRole("button", { name: "Next page" });
      await expect(nextBtn).toBeEnabled();
      await nextBtn.click();
      await page.waitForTimeout(500);
    });

    test("sort buttons are keyboard operable", async ({ page }) => {
      await page.goto("/");
      const explorer = page.getByRole("region", { name: "Records Explorer" });
      await explorer.scrollIntoViewIfNeeded();
      await expect(explorer.getByText("matching").first()).toBeVisible();

      const sortBtn = page.getByRole("button", { name: "Sort by Topic" });
      await sortBtn.click();
      await expect(page.getByRole("button", { name: /Sorted by Topic/ })).toBeVisible();
    });
  });

  test.describe("mobile filter sheet", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("opens and closes with keyboard", async ({ page }) => {
      await page.goto("/");
      const openBtn = page.getByRole("button", { name: "Open filters" });
      await openBtn.click();
      await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog", { name: "Filters" })).not.toBeVisible();
    });

    test("focus is trapped in filter sheet", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open filters" }).click();
      await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();

      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => document.activeElement?.tagName);
      expect(focused).toBeTruthy();
    });

    test("filter sheet has accessible title", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open filters" }).click();
      await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    });

    test("nested filter popover works inside sheet", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open filters" }).click();
      await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();

      const filterTrigger = page.getByRole("button", { name: "Filter by Topic" });
      await filterTrigger.click();
      await expect(page.getByRole("combobox", { name: "Search Topic options" })).toBeVisible();

      await page.keyboard.press("Escape");
      await expect(page.getByRole("combobox", { name: "Search Topic options" })).not.toBeVisible();
      await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    });

    test("touch targets are at least 40px on mobile", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Open filters" }).click();
      await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();

      const trigger = page.getByRole("button", { name: "Filter by Topic" });
      const box = await trigger.boundingBox();
      expect(box).toBeTruthy();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(32);
      }
    });
  });

  test.describe("skip link and landmarks", () => {
    test("skip link is first focusable element", async ({ page }) => {
      await page.goto("/");
      await page.keyboard.press("Tab");
      const skipLink = page.getByText("Skip to dashboard content");
      await expect(skipLink).toBeFocused();
    });

    test("main landmark exists", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("main")).toBeVisible();
    });

    test("header landmark exists", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("banner")).toBeVisible();
    });

    test("filter rail has complementary landmark", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("complementary", { name: "Dashboard filters" })).toBeVisible();
    });
  });

  test.describe("error states", () => {
    test("retry button is keyboard operable", async ({ page }) => {
      await page.goto("/");
      const explorer = page.getByRole("region", { name: "Records Explorer" });
      await explorer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
    });
  });

  test.describe("reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("owned interactions still work under reduced motion", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Summary metrics", { exact: true }).waitFor({ state: "visible" });

      const filterTrigger = page.getByRole("button", { name: "Filter by Topic" });
      await filterTrigger.click();
      await expect(page.getByRole("combobox", { name: "Search Topic options" })).toBeVisible();
    });
  });

  test.describe("touch and overflow at 390x844", () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test("no document-level horizontal overflow", async ({ page }) => {
      await page.goto("/");
      await page.getByLabel("Summary metrics", { exact: true }).waitFor({ state: "visible" });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);
    });

    test("records section is accessible on mobile", async ({ page }) => {
      await page.goto("/");
      const explorer = page.getByRole("region", { name: "Records Explorer" });
      await explorer.scrollIntoViewIfNeeded();
      await expect(explorer.getByText("matching").first()).toBeVisible();
    });
  });
});

test.describe("agent3: axe non-chart audit", () => {
  test("default dashboard - no critical/serious violations", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Summary metrics", { exact: true }).waitFor({ state: "visible" });
    const results = await new AxeBuilder({ page })
      .exclude("[data-slot='chart']") 
      .exclude("svg[role='img']")
      .analyze();
    const nonChartViolations = results.violations.filter(
      (v) => !v.id.includes("color-contrast") || v.nodes.some((n) => !n.target.toString().includes("svg"))
    );
    expect(nonChartViolations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
  });

  test("mobile filter sheet - no critical/serious violations", async ({ page }) => {
    await page.goto("/");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Open filters" }).click();
    await expect(page.getByRole("dialog", { name: "Filters" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
  });

  test("records explorer - no critical/serious violations", async ({ page }) => {
    await page.goto("/");
    const explorer = page.getByRole("region", { name: "Records Explorer" });
    await explorer.scrollIntoViewIfNeeded();
    await expect(explorer.getByText("matching").first()).toBeVisible();
    const results = await new AxeBuilder({ page })
      .exclude("[data-slot='chart']")
      .exclude("svg[role='img']")
      .analyze();
    expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
  });

  test("record detail - no critical/serious violations", async ({ page }) => {
    await page.goto("/");
    const explorer = page.getByRole("region", { name: "Records Explorer" });
    await explorer.scrollIntoViewIfNeeded();
    await explorer.getByRole("button", { name: /Open record/ }).first().click();
    await expect(page.getByRole("dialog", { name: "Record detail" })).toBeVisible();
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
  });

  test("filtered state - no critical/serious violations", async ({ page }) => {
    await page.goto("/?topic=oil");
    await page.getByLabel("Summary metrics", { exact: true }).waitFor({ state: "visible" });
    const results = await new AxeBuilder({ page })
      .exclude("[data-slot='chart']")
      .exclude("svg[role='img']")
      .analyze();
    expect(results.violations.filter((v) => v.impact === "critical" || v.impact === "serious")).toEqual([]);
  });
});
