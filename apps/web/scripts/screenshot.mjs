import { chromium } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL || "http://localhost:3001";
const OUT = "docs/screenshots";

const viewports = [
  { name: "desktop-1440x900", width: 1440, height: 900 },
  { name: "tablet-1024x768", width: 1024, height: 768 },
  { name: "mobile-390x844", width: 390, height: 844 },
];

const pages = [
  { path: "/", label: "dashboard" },
  { path: "/?topic=oil", label: "filtered-oil" },
];

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
    });
    const page = await context.newPage();

    for (const pg of pages) {
      await page.goto(`${BASE}${pg.path}`, { waitUntil: "networkidle" });
      // wait for charts to render
      await page.waitForTimeout(2000);
      const filename = `${OUT}/${vp.name}-${pg.label}.png`;
      await page.screenshot({ path: filename, fullPage: true });
      console.log(`Saved: ${filename}`);
    }

    await context.close();
  }

  await browser.close();
  console.log("All screenshots captured.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
