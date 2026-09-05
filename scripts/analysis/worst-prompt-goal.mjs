#!/usr/bin/env node
// Ad-hoc follow-up query over readability-ru.json: worst promptRu/goalRu rows only.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_PATH = path.join(ROOT, "evidence", "research-2026-09-05", "readability-ru.json");
const data = JSON.parse(fs.readFileSync(JSON_PATH, "utf8"));

const rows = data.rows.filter(
  (r) => (r.field === "promptRu" || r.field === "goalRu") && r.text
);

const worst = [...rows]
  .sort((a, b) => (b.wordCount - a.wordCount) || (b.longestSentenceWords - a.longestSentenceWords))
  .slice(0, 10);

for (const r of worst) {
  console.log(
    `${r.file}:${r.line} [${r.field}] wordCount=${r.wordCount} longestSentenceWords=${r.longestSentenceWords} flags=${r.flags.join(",") || "-"}`
  );
  console.log(`  "${r.text}"`);
}
