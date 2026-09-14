#!/usr/bin/env node
/**
 * Deterministic E2E orchestration for Windows.
 * Starts Mongo (via Docker), FastAPI, Next.js production server,
 * runs Playwright, and reliably cleans up all child process trees.
 *
 * Usage:
 *   pnpm build && node scripts/run-e2e.mjs
 * or:
 *   node scripts/run-e2e.mjs --skip-build
 */

import { spawn, spawnSync } from "node:child_process";
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
const MONGODB_DB = "insightscope";
const ALLOWED_ORIGINS = `http://localhost:${FRONTEND_PORT}`;
const BACKEND_READY_URL = `http://127.0.0.1:${BACKEND_PORT}/api/v1/ready`;
const FRONTEND_READY_URL = `http://localhost:${FRONTEND_PORT}/`;
const PLAYWRIGHT_CONFIG = "playwright.external.config.ts";

const SKIP_BUILD = process.argv.includes("--skip-build");
const HEADED = process.argv.includes("--headed");

let apiChild = null;
let webChild = null;
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

async function waitForPortFree(port, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkPort(port)) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

async function waitForReady(url, timeoutMs = 60000, label = "service") {
  const start = Date.now();
  log(`Waiting for ${label} at ${url}...`);
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        log(`${label} ready`);
        return true;
      }
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`${label} at ${url} did not become ready within ${timeoutMs}ms`);
}

function killProcessTree(pid) {
  if (process.platform === "win32") {
    try {
      spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
    } catch {
      // ignore
    }
  } else {
    try {
      process.kill(-pid, "SIGKILL");
    } catch {
      // ignore
    }
  }
}

function spawnTracked(command, args, options = {}) {
  const child = spawn(command, args, {
    ...options,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, ...options.env },
    windowsHide: true,
  });

  child.stdout?.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.log(`[${options.name || command}]`, msg);
  });
  child.stderr?.on("data", (data) => {
    const msg = data.toString().trim();
    if (msg) console.error(`[${options.name || command}]`, msg);
  });
  child.on("error", (err) => {
    errorLog(`Child process error (${options.name || command}):`, err.message);
  });
  child.on("exit", (code, signal) => {
    log(`Child exited (${options.name || command}): code=${code}, signal=${signal}`);
  });
  return child;
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
  // Give Mongo a moment to accept connections
  await new Promise((r) => setTimeout(r, 2000));
  log("MongoDB container started");
}

async function buildFrontend() {
  log("Building production frontend...");
  const result = spawnSync("pnpm", ["build"], {
    cwd: WEB_DIR,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    throw new Error("Frontend build failed");
  }
  log("Frontend build complete");
}

async function startBackend() {
  log("Starting FastAPI backend...");
  const env = {
    MONGODB_URI,
    MONGODB_DB,
    ALLOWED_ORIGINS,
    PATH: process.env.PATH,
  };
  // Use uvicorn directly from the virtual environment
  const uvicornPath = resolve(API_DIR, ".venv", "Scripts", "uvicorn.exe");
  apiChild = spawnTracked(uvicornPath, ["app.main:app", "--port", String(BACKEND_PORT)], {
    cwd: API_DIR,
    env,
    name: "FastAPI",
  });
  await waitForReady(BACKEND_READY_URL, 120000, "FastAPI /api/v1/ready");
}

async function startFrontend() {
  log("Starting Next.js production server...");
  const env = {
    NEXT_PUBLIC_API_BASE_URL: `http://localhost:${BACKEND_PORT}`,
  };
  webChild = spawnTracked("node", ["node_modules/next/dist/bin/next", "start", "--port", String(FRONTEND_PORT)], {
    cwd: WEB_DIR,
    env,
    name: "Next.js",
  });
  await waitForReady(FRONTEND_READY_URL, 120000, "Next.js production server");
}

async function runPlaywright() {
  log("Running Playwright tests...");
  const args = ["exec", "playwright", "test", "-c", PLAYWRIGHT_CONFIG];
  if (HEADED) args.push("--headed");
  log(`Executing: pnpm ${args.join(" ")}`);
  const result = spawnSync("pnpm", args, {
    cwd: WEB_DIR,
    stdio: "inherit",
    env: { ...process.env, E2E_BASE_URL: `http://localhost:${FRONTEND_PORT}` },
    shell: true,
  });
  log(`Playwright exited with status: ${result.status}, signal: ${result.signal}, error: ${result.error?.message}`);
  if (result.error) {
    errorLog("Playwright spawn error:", result.error.message);
  }
  return result.status ?? 1;
}

async function cleanup() {
  log("Cleaning up child processes...");
  if (webChild?.pid) {
    log(`Stopping Next.js (PID ${webChild.pid})...`);
    killProcessTree(webChild.pid);
  }
  if (apiChild?.pid) {
    log(`Stopping FastAPI (PID ${apiChild.pid})...`);
    killProcessTree(apiChild.pid);
  }
  // Final port verification
  await waitForPortFree(FRONTEND_PORT, 5000);
  await waitForPortFree(BACKEND_PORT, 5000);
  log("Cleanup complete");
}

async function main() {
  // Handle termination signals
  const signals = ["SIGINT", "SIGTERM", "SIGBREAK"];
  signals.forEach((sig) => {
    process.on(sig, () => {
      log(`Received ${sig}, cleaning up...`);
      cleanup().then(() => process.exit(130));
    });
  });

  // Pre-flight port checks
  for (const port of [FRONTEND_PORT, BACKEND_PORT]) {
    const free = await checkPort(port);
    if (!free) {
      errorLog(`Port ${port} is already in use. Please stop the conflicting process.`);
      process.exit(1);
    }
  }

  try {
    await ensureMongo();

    if (!SKIP_BUILD) {
      await buildFrontend();
    } else {
      log("Skipping build (--skip-build flag)");
      // Verify build exists
      const buildPath = resolve(WEB_DIR, ".next");
      log(`Checking for build at: ${buildPath}`);
      if (!existsSync(buildPath)) {
        throw new Error(`No .next build directory found at ${buildPath}. Run without --skip-build first.`);
      }
    }

    await startBackend();
    await startFrontend();

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
    await cleanup();
    process.exit(exitCode);
  }
}

main();