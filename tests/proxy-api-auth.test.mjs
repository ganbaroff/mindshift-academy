#!/usr/bin/env node
/** Verifies the real Next proxy boundary, not just helper predicates. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.TEST_PORT || 3012);
const base = `http://localhost:${port}`;
const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const server = spawn(process.execPath, [nextCli, "dev", "-p", String(port)], {
  cwd: root,
  stdio: "ignore",
});

function stop() {
  if (!server.pid) return;
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(server.pid), "/T", "/F"]);
  } else {
    server.kill("SIGTERM");
  }
}

async function waitForServer() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${base}/api/generate-silhouette`, {
        signal: AbortSignal.timeout(3000),
      });
      if (response.status > 0) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("Next server did not become reachable");
}

try {
  await waitForServer();
  const privatePaths = [
    "/api/chat",
    "/api/child-data",
    "/api/consent/request-code",
    "/api/consent/revoke",
    "/api/consent/status",
    "/api/consent/verify",
    "/api/gacha/claim",
    "/api/monster",
    "/api/reset",
    "/api/tts",
    "/api/user",
    "/api/tasks/attempt",
  ];
  const privateResponses = await Promise.all(
    privatePaths.map(async (path) => ({
      path,
      response: await fetch(`${base}${path}`, { signal: AbortSignal.timeout(10000) }),
    }))
  );
  const publicResponse = await fetch(`${base}/api/generate-silhouette`, {
    signal: AbortSignal.timeout(10000),
  });

  const unprotected = privateResponses.filter(({ response }) => response.status !== 401);
  if (unprotected.length > 0) {
    throw new Error(
      `Anonymous private APIs must be 401: ${unprotected.map(({ path, response }) => `${path}=${response.status}`).join(", ")}`
    );
  }
  if (publicResponse.status !== 405) {
    throw new Error(`Public silhouette GET must reach its handler (405), got ${publicResponse.status}`);
  }
  console.log(`PASS proxy returns 401 for all ${privatePaths.length} private APIs and reaches public silhouette handler`);
} finally {
  stop();
}
