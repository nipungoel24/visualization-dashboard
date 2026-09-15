#!/usr/bin/env node
/**
 * Deterministic E2E orchestration for Windows.
 * Starts Mongo (via Docker), seeds the database, builds the frontend,
 * then invokes Playwright (which owns FastAPI + Next.js lifecycle).
 *
 * Usage:
 *   pnpm build && node scripts/run-e2e.mjs
 * or:
 *   node scripts/run-e2e.mjs --skip-build
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const WEB_DIR = resolve(__dirname, "..");
const ROOT = resolve(WEB_DIR, "..", "..");
const API_DIR = resolve(ROOT, "apps", "api");

const FRONTEND_PORT = 3001;
const BACKEND_PORT = 8000;
const MONGODB_URI = "mongodb://localhost:27017";
const MONGODB_DB = "insightscope_e2e";
const PLAYWRIGHT_CONFIG = "playwright.config.ts";

const SKIP_BUILD = process.argv.includes("--skip-build");
const HEADED = process.argv.includes("--headed");

let exitCode = 0;

function log(...args) {
  console.log(`[orchestrator]`, new Date().toISOString(), ...args);
}

function errorLog(...args) {
  console.error(`[orchestrator]`, new Date().toISOString(), ...args);
}

function checkPort(port) {
  return new Promise((resolve) => {
    const net = require("node:net");
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
}

async function ensureMongo() {
  log("Ensuring MongoDB is running via Docker...");
  const result = spawnSync("docker", ["compose", "up", "-d", "mongo"], {
    cwd: ROOT,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Failed to start MongoDB via docker compose");
  }
  log("Waiting for MongoDB to be healthy...");
  for (let i = 0; i < 30; i++) {
    const ps = spawnSync("docker", ["compose", "ps", "--format", "json"], {
      cwd: ROOT,
      stdio: "pipe",
    });
    if (ps.status === 0) {
      try {
        const lines = ps.stdout.toString().trim().split("\n");
        for (const line of lines) {
          const info = JSON.parse(line);
          if (info.Service === "mongo" && info.Health === "healthy") {
            log("MongoDB is healthy");
            return;
          }
        }
      } catch {
        // ignore parse errors
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("MongoDB did not become healthy within 30 seconds");
}

async function seedDatabase() {
  log("Seeding database...");
  const env = {
    MONGODB_URI,
    MONGODB_DB,
    PATH: process.env.PATH,
  };
  const pythonPath = resolve(API_DIR, ".venv", "Scripts", "python.exe");
  const result = spawnSync(pythonPath, ["-m", "app.seed"], {
    cwd: API_DIR,
    env,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Database seeding failed");
  }
  log("Database seeded successfully");
}

async function buildFrontend() {
  log("Building production frontend...");
  const result = spawnSync("pnpm", ["build"], {
    cwd: WEB_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_PUBLIC_API_BASE_URL: `http://localhost:${BACKEND_PORT}`,
    },
  });
  if (result.status !== 0) {
    throw new Error("Frontend build failed");
  }
  log("Frontend build complete");
}

async function runPlaywright() {
  log("Running Playwright tests (Playwright owns FastAPI + Next.js lifecycle)...");
  const args = ["exec", "playwright", "test", "-c", PLAYWRIGHT_CONFIG];
  if (HEADED) args.push("--headed");
  log(`Executing: pnpm ${args.join(" ")}`);
  const result = spawnSync("pnpm", args, {
    cwd: WEB_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      E2E_BASE_URL: `http://localhost:${FRONTEND_PORT}`,
      MONGODB_URI,
      MONGODB_DB,
    },
    shell: true,
  });
  log(`Playwright exited with status: ${result.status}, signal: ${result.signal}, error: ${result.error?.message}`);
  if (result.error) {
    errorLog("Playwright spawn error:", result.error.message);
  }
  return result.status ?? 1;
}

async function main() {
  const signals = ["SIGINT", "SIGTERM", "SIGBREAK"];
  signals.forEach((sig) => {
    process.on(sig, () => {
      log(`Received ${sig}, exiting...`);
      process.exit(130);
    });
  });

  for (const port of [FRONTEND_PORT, BACKEND_PORT]) {
    const free = await checkPort(port);
    if (!free) {
      errorLog(`Port ${port} is already in use. Please stop the conflicting process.`);
      process.exit(1);
    }
  }

  try {
    await ensureMongo();
    await seedDatabase();

    if (!SKIP_BUILD) {
      await buildFrontend();
    } else {
      log("Skipping build (--skip-build flag)");
      const buildPath = resolve(WEB_DIR, ".next");
      log(`Checking for build at: ${buildPath}`);
      if (!existsSync(buildPath)) {
        throw new Error(`No .next build directory found at ${buildPath}. Run without --skip-build first.`);
      }
    }

    exitCode = await runPlaywright();

    if (exitCode === 0) {
      log("Playwright tests PASSED");
    } else {
      errorLog("Playwright tests FAILED");
    }
  } catch (err) {
    errorLog("Orchestration failed:", err.message);
    exitCode = 1;
  } finally {
    process.exit(exitCode);
  }
}

main();