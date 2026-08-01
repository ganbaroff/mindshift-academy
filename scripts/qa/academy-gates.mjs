import { URL } from "node:url";
import { dirname, join } from "node:path";

export const GATE_MODES = ["offline", "browser", "live", "prod"];

export function platformInvocation(
  command,
  args,
  {
    platform = process.platform,
    execPath = process.execPath,
    npmExecPath = process.env.npm_execpath,
  } = {}
) {
  if (platform === "win32" && (command === "npm" || command === "npx")) {
    const npmBin = npmExecPath
      ? dirname(npmExecPath)
      : join(dirname(execPath), "node_modules", "npm", "bin");
    const cli = command === "npm" ? "npm-cli.js" : "npx-cli.js";
    return { command: execPath, args: [join(npmBin, cli), ...args] };
  }
  return { command, args };
}

export const GATE_DEFINITIONS = Object.freeze({
  offline: {
    description: "Deterministic Academy checks without browsers or live AI providers",
    commands: [
      ["npm", ["audit", "--omit=dev", "--audit-level=high"]],
      ["npm", ["run", "lint"]],
      ["npm", ["run", "test:config"]],
      ["npm", ["run", "test:ui"]],
      ["npm", ["run", "test:gate-contract"]],
      ["npm", ["run", "test:tasks"]],
      ["npm", ["run", "test:interpreter-contract"]],
      ["npm", ["run", "test:session"]],
      ["npm", ["run", "test:attempt-trust"]],
      ["npm", ["run", "test:structured-attempt"]],
      ["npm", ["run", "test:task-surfaces"]],
      ["npm", ["run", "test:session-integration"]],
      ["npm", ["run", "test:display-grid-accessibility"]],
      ["npm", ["run", "test:onboarding-comprehension"]],
      ["npm", ["run", "test:dual-children"]],
      ["npm", ["run", "test:w2"]],
      ["npm", ["run", "test:w3"]],
      ["npm", ["run", "test:w4"]],
      ["npm", ["run", "test:consent"]],
      ["npm", ["run", "test:data-lifecycle"]],
      ["node", ["tests/proxy-api-auth.test.mjs"]],
      ["node", ["tests/live-safety-startup.test.mjs"]],
      ["npm", ["run", "build"]],
    ],
  },
  browser: {
    description: "Current /session learner UI, never legacy /lesson routes",
    commands: [["npm", ["run", "test:e2e:current-sessions"]]],
  },
  live: {
    description: "Explicitly approved synthetic live-provider smoke",
    commands: [["npm", ["run", "test:live:synthetic"]]],
  },
  prod: {
    description: "Read-only production boundary smoke for an explicit Academy origin",
    commands: [["node", ["scripts/qa/prod-smoke.mjs"]]],
  },
});

const OFFLINE_PROVIDER_ENV = [
  "NVIDIA_API_KEY",
  "NVIDIA_BASE_URL",
  "OPENAI_API_KEY",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "AZURE_OPENAI_API_KEY",
  "AZURE_OPENAI_KEY",
  "AZURE_OPENAI_KEY2",
  "AZURE_API_KEY",
  "AZURE_OPENAI_ENDPOINT",
  "AZURE_OPENAI_DEPLOYMENT",
];

export function gateEnvironment(mode, source = process.env) {
  const env = { ...source };
  if (mode === "offline") {
    for (const name of OFFLINE_PROVIDER_ENV) delete env[name];
  }
  return env;
}

function validHttpsOrigin(raw) {
  try {
    const url = new URL(raw);
    return (
      url.protocol === "https:" &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === "443") &&
      url.pathname === "/" &&
      !url.search &&
      !url.hash &&
      url.origin === raw.replace(/\/$/, "")
    );
  } catch {
    return false;
  }
}

export function validateGateRequest(mode, env = process.env) {
  const errors = [];
  if (!GATE_MODES.includes(mode)) {
    return [`Unknown gate mode: ${mode || "<missing>"}`];
  }

  if (mode === "live") {
    if (env.ACADEMY_ALLOW_LIVE_SMOKE !== "1") {
      errors.push("Live smoke requires ACADEMY_ALLOW_LIVE_SMOKE=1");
    }
    const maxUsd = Number(env.ACADEMY_LIVE_MAX_USD);
    if (!Number.isFinite(maxUsd) || maxUsd <= 0 || maxUsd > 1) {
      errors.push("Live smoke requires ACADEMY_LIVE_MAX_USD between 0 and 1");
    }
    const inputRate = Number(env.ACADEMY_LIVE_INPUT_USD_PER_MILLION);
    if (!Number.isFinite(inputRate) || inputRate < 0) {
      errors.push("Live smoke requires ACADEMY_LIVE_INPUT_USD_PER_MILLION");
    }
    const outputRate = Number(env.ACADEMY_LIVE_OUTPUT_USD_PER_MILLION);
    if (!Number.isFinite(outputRate) || outputRate < 0) {
      errors.push("Live smoke requires ACADEMY_LIVE_OUTPUT_USD_PER_MILLION");
    }
  }

  if (mode === "prod" && !validHttpsOrigin(env.ACADEMY_PROD_URL ?? "")) {
    errors.push("Production smoke requires ACADEMY_PROD_URL as a fixed HTTPS origin");
  }

  return errors;
}

export function makeGateReceipt({
  mode,
  sha,
  startedAt,
  finishedAt,
  commands,
  expectedCommands = [],
  blockedReason = null,
  warnings = [],
  workspaceClean = true,
}) {
  const evidenceHasShape = commands.every(
    (item) =>
      typeof item.command === "string" &&
      item.command.length > 0 &&
      Number.isInteger(item.exitCode) &&
      Number.isInteger(item.elapsedMs) &&
      item.elapsedMs >= 0
  );
  const evidenceIsComplete =
    expectedCommands.length > 0 &&
    commands.length === expectedCommands.length &&
    commands.every((item, index) => item.command === expectedCommands[index]);
  const metadataIsValid =
    GATE_MODES.includes(mode) &&
    /^[0-9a-f]{7,40}$/i.test(sha) &&
    !Number.isNaN(Date.parse(startedAt)) &&
    !Number.isNaN(Date.parse(finishedAt));

  let verdict = "UNVERIFIED";
  let resolvedBlockedReason = blockedReason;
  if (blockedReason) verdict = "BLOCKED";
  else if (!metadataIsValid || !evidenceHasShape) {
    verdict = "UNVERIFIED";
  }
  else if (commands.some((item) => item.exitCode === 2)) {
    verdict = "BLOCKED";
    resolvedBlockedReason = "A gate command reported an unmet prerequisite";
  } else if (commands.some((item) => item.exitCode !== 0)) verdict = "FAIL";
  else if (!evidenceIsComplete) verdict = "UNVERIFIED";
  else if (!workspaceClean) verdict = "FAIL";
  else verdict = "PASS";

  return {
    schemaVersion: 1,
    gate: mode,
    sha,
    startedAt,
    finishedAt,
    verdict,
    commands,
    warnings,
    blockedReason: resolvedBlockedReason,
    workspaceClean,
  };
}
