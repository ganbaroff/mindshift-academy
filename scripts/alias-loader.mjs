// ESM resolve hook: maps the tsconfig `@/*` path alias to <repoRoot>/src/*
// so plain `node` can import the REAL TS source (src/lib/rewards.ts).
// Node 24 strips TS types natively; it only needs help resolving `@/`.
import { pathToFileURL } from "node:url";
import { existsSync, statSync } from "node:fs";
import path from "node:path";

const srcRoot = path.join(process.cwd(), "src");

function probe(base) {
  const candidates = [
    base,
    base + ".ts",
    base + ".tsx",
    base + ".js",
    base + ".mjs",
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
    path.join(base, "index.js"),
  ];
  for (const c of candidates) {
    if (existsSync(c) && statSync(c).isFile()) return c;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const resolved = probe(path.join(srcRoot, specifier.slice(2)));
    if (resolved) {
      return { url: pathToFileURL(resolved).href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}
