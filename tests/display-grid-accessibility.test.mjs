import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(process.cwd(), "src/components/curriculum/DisplayGrid.tsx"), "utf8");

assert.doesNotMatch(source, /role="img"[^>]*aria-hidden="true"/, "meaningful grid is not hidden from assistive technology");
assert.match(source, /function\s+buildAccessibleSummary/, "grid exposes a cell summary helper");
assert.match(source, /aria-label=\{accessibleSummary\}/, "grid uses the accessible cell summary as its name");
assert.match(source, /Закрашены клетки|Целевые клетки|Несовпадения|нет/i, "grid summary has Russian state labels and an empty state");
assert.match(source, /aria-hidden="true"/, "individual decorative cells stay hidden");
assert.match(source, /tabIndex=\{-1\}/, "individual decorative cells stay non-focusable");

console.log("display-grid-accessibility: semantic grid summary contract passes");
