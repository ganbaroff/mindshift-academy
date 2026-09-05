#!/usr/bin/env node
// Plain-Node readability scan of child-facing Russian curriculum copy.
// No deps. Walks src/content/curriculum/**/*.ts, extracts string literals
// assigned to a fixed set of keys, computes Russian-oriented readability
// metrics per string, aggregates per key and per week.

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const CURRICULUM_DIR = path.join(ROOT, "src", "content", "curriculum");
const OUT_DIR = path.join(ROOT, "evidence", "research-2026-09-05");
const OUT_JSON = path.join(OUT_DIR, "readability-ru.json");

const TARGET_FIELDS = [
  "titleRu",
  "explanationRu",
  "goalRu",
  "doneWhenRu",
  "promptRu",
  "hintRu",
  "feedbackRu",
  "storyRu",
];

const VOWELS = "аеёиоуыэюя";
const VOWEL_RE = new RegExp(`[${VOWELS}]`, "gi");
const UI_LATIN_WHITELIST = new Set(["ai", "ok", "id", "url", "ui", "ux"]);

function walk(dir) {
  const out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true });
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith(".ts")) {
      const parent = entry.parentPath || entry.path || dir;
      out.push(path.join(parent, entry.name));
    }
  }
  return out;
}

function deriveWeek(filePath) {
  const m = filePath.replace(/\\/g, "/").match(/week-(\d+)/);
  return m ? Number(m[1]) : null;
}

function unescapeJsString(raw) {
  return raw
    .replace(/\\n/g, " ")
    .replace(/\\t/g, " ")
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\`/g, "`")
    .replace(/\\\\/g, "\\");
}

const FIELD_ALTERNATION = TARGET_FIELDS.join("|");
const STRING_ASSIGN_RE = new RegExp(
  `\\b(${FIELD_ALTERNATION})\\s*:\\s*(` +
    `"(?:[^"\\\\]|\\\\.)*"` +
    `|'(?:[^'\\\\]|\\\\.)*'` +
    `|\`(?:[^\`\\\\]|\\\\.)*\`` +
    `)`,
  "g"
);

function lineOf(content, index) {
  let line = 1;
  for (let i = 0; i < index; i++) {
    if (content.charCodeAt(i) === 10) line++;
  }
  return line;
}

function extractStrings(fileContent, filePath) {
  const rows = [];
  let match;
  STRING_ASSIGN_RE.lastIndex = 0;
  while ((match = STRING_ASSIGN_RE.exec(fileContent)) !== null) {
    const field = match[1];
    const literal = match[2];
    const quoteChar = literal[0];
    const inner = literal.slice(1, -1);
    if (quoteChar === "`" && /\$\{/.test(inner)) {
      rows.push({
        file: path.relative(ROOT, filePath).replace(/\\/g, "/"),
        line: lineOf(fileContent, match.index),
        field,
        text: null,
        skippedTemplateInterpolation: true,
      });
      continue;
    }
    const text = unescapeJsString(inner).trim();
    if (!text) continue;
    rows.push({
      file: path.relative(ROOT, filePath).replace(/\\/g, "/"),
      line: lineOf(fileContent, match.index),
      field,
      text,
    });
  }
  return rows;
}

function splitSentences(text) {
  const parts = text.split(/[.!?…]+(?:\s+|$)/u);
  return parts.map((s) => s.trim()).filter((s) => s.length > 0);
}

function tokenizeWords(text) {
  const matches = text.match(/[A-Za-zА-Яа-яЁё]+(?:[-'][A-Za-zА-Яа-яЁё]+)*/gu);
  return matches || [];
}

function countVowels(word) {
  const m = word.match(VOWEL_RE);
  return m ? m.length : 0;
}

function isLatinToken(word) {
  return /^[A-Za-z]+(?:[-'][A-Za-z]+)*$/.test(word);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function analyzeText(text, field) {
  const sentences = splitSentences(text);
  const sentenceWordCounts = sentences.map((s) => tokenizeWords(s).length);
  const allWords = tokenizeWords(text);
  const wordCount = allWords.length;
  const sumSentenceWords = sentenceWordCounts.reduce((a, b) => a + b, 0);
  const wordsPerSentenceMean = sentenceWordCounts.length
    ? sumSentenceWords / sentenceWordCounts.length
    : wordCount;
  const wordsPerSentenceMax = sentenceWordCounts.length
    ? Math.max(...sentenceWordCounts)
    : wordCount;
  const longestSentenceWords = wordsPerSentenceMax;

  const longWords = allWords.filter((w) => countVowels(w) >= 4);
  const longWordShare = wordCount ? longWords.length / wordCount : 0;

  const latinTokensAll = allWords.filter(isLatinToken);
  const latinTokensNonUi = latinTokensAll.filter(
    (w) => !UI_LATIN_WHITELIST.has(w.toLowerCase())
  );
  const latinTokens = latinTokensAll.length;

  const hasNumbersAbstraction = /\d/.test(text) && /шаг|число/iu.test(text);

  const flags = [];
  if (sentenceWordCounts.some((c) => c > 12)) flags.push("sentenceOver12");
  if ((field === "promptRu" || field === "goalRu") && wordCount > 40)
    flags.push("promptOver40");
  if (latinTokensNonUi.length > 0) flags.push("latinLeak");

  return {
    sentenceCount: sentences.length || (wordCount ? 1 : 0),
    wordCount,
    wordsPerSentenceMean: round2(wordsPerSentenceMean),
    wordsPerSentenceMax,
    longestSentenceWords,
    longWordShare: round2(longWordShare),
    latinTokens,
    hasNumbersAbstraction,
    flags,
  };
}

function mean(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function p90(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil(0.9 * sorted.length) - 1);
  return sorted[idx];
}

function main() {
  if (!fs.existsSync(CURRICULUM_DIR)) {
    console.error(`Curriculum dir not found: ${CURRICULUM_DIR}`);
    process.exit(1);
  }
  const files = walk(CURRICULUM_DIR).sort();
  const rows = [];
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const extracted = extractStrings(content, file);
    for (const r of extracted) {
      if (r.text === null) {
        rows.push({ ...r, week: deriveWeek(r.file) });
        continue;
      }
      const metrics = analyzeText(r.text, r.field);
      rows.push({ ...r, week: deriveWeek(r.file), ...metrics });
    }
  }

  const analyzable = rows.filter((r) => r.text !== null && r.text !== undefined);

  const byField = {};
  for (const r of analyzable) {
    if (!byField[r.field]) byField[r.field] = [];
    byField[r.field].push(r);
  }
  const fieldAgg = Object.fromEntries(
    Object.entries(byField).map(([field, list]) => [
      field,
      {
        count: list.length,
        meanWordsPerSentence: round2(mean(list.map((r) => r.wordsPerSentenceMean))),
        p90LongestSentence: p90(list.map((r) => r.longestSentenceWords)),
        maxLongestSentence: Math.max(...list.map((r) => r.longestSentenceWords)),
        pctFlagged: round2(
          (100 * list.filter((r) => r.flags.length > 0).length) / list.length
        ),
      },
    ])
  );

  const byWeek = {};
  for (const r of analyzable) {
    const w = r.week ?? "unknown";
    if (!byWeek[w]) byWeek[w] = [];
    byWeek[w].push(r);
  }
  const weekAgg = Object.fromEntries(
    Object.entries(byWeek)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([week, list]) => [
        week,
        {
          count: list.length,
          meanWordsPerSentence: round2(mean(list.map((r) => r.wordsPerSentenceMean))),
          p90LongestSentence: p90(list.map((r) => r.longestSentenceWords)),
          maxLongestSentence: Math.max(...list.map((r) => r.longestSentenceWords)),
          pctFlagged: round2(
            (100 * list.filter((r) => r.flags.length > 0).length) / list.length
          ),
        },
      ])
  );

  const output = {
    generatedAt: new Date().toISOString(),
    filesScanned: files.map((f) => path.relative(ROOT, f).replace(/\\/g, "/")),
    totalRows: rows.length,
    analyzableRows: analyzable.length,
    skippedTemplateInterpolation: rows.filter((r) => r.skippedTemplateInterpolation).length,
    rows,
    aggregates: { byField: fieldAgg, byWeek: weekAgg },
  };

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(output, null, 2), "utf8");

  console.log(`Scanned ${files.length} files, extracted ${analyzable.length} strings.`);
  console.log("\n=== Aggregates by field ===");
  console.table(fieldAgg);
  console.log("\n=== Aggregates by week ===");
  console.table(weekAgg);

  const worst = [...analyzable]
    .sort((a, b) => b.longestSentenceWords - a.longestSentenceWords)
    .slice(0, 20);
  console.log("\n=== 20 worst strings (by longestSentenceWords) ===");
  for (const r of worst) {
    console.log(
      `${r.file}:${r.line} [${r.field}] longestSentenceWords=${r.longestSentenceWords} wordCount=${r.wordCount} flags=${r.flags.join(",") || "-"}\n  "${r.text}"`
    );
  }

  console.log(`\nWritten: ${path.relative(ROOT, OUT_JSON).replace(/\\/g, "/")}`);
}

main();
