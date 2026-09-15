import { defineConfig } from "@playwright/test";

/**
 * The suite boots its own servers (fresh per run, reaped afterwards):
 * real FastAPI + real production Next.js build + real MongoDB.
 * NOTE: `NEXT_PUBLIC_API_BASE_URL` is baked at build time — rebuild the app
 * with the same value before running e2e after frontend changes.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3001",
  },
  webServer: [
    {
      command: "uv run uvicorn app.main:app --port 8000",
      cwd: "../api",
      env: {
        ...process.env,
        MONGODB_URI: "mongodb://localhost:27017",
        MONGODB_DB: "insightscope_e2e",
        ALLOWED_ORIGINS: "http://localhost:3001",
      },
      url: "http://127.0.0.1:8000/api/v1/health",
      timeout: 240_000,
      reuseExistingServer: false,
    },
    {
      command: "node node_modules/next/dist/bin/next start --port 3001",
      cwd: ".",
      env: {
        ...process.env,
        NEXT_PUBLIC_API_BASE_URL: "http://localhost:8000",
      },
      url: "http://localhost:3001/",
      timeout: 240_000,
      reuseExistingServer: false,
    },
  ],
});
