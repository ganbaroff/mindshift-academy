#!/usr/bin/env node
/**
 * Crystal economy rules that must hold without a network, a key or a browser.
 *
 * These lived in tests/dual-children.test.mjs, which cannot be part of the CI gate: that file
 * deliberately fails when its live-interpreter half is skipped, because a green run without a
 * provider key would be false confidence. Good design, wrong home for a constant relation — so
 * the rules moved here, where nothing can skip.
 */
import {
  HINT_CRYSTAL_COST,
  TASK_PASS_CRYSTAL_REWARD,
  STARTER_CRYSTALS,
} from "../src/content/curriculum/types.ts";

let failed = 0;
const check = (name, ok) => {
  if (!ok) failed += 1;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}`);
};

/**
 * Asking for help must never be the expensive move. While a hint cost more than a task paid
 * (5 against 3, until 2026-09-08) the cheapest route to a hint was to fail twice and take the
 * free one — the product was paying children to fail before asking. See the comment on
 * HINT_CRYSTAL_COST and src/lib/tasks/stuck.ts.
 */
check("a hint costs less than a task pays", HINT_CRYSTAL_COST < TASK_PASS_CRYSTAL_REWARD);
check("the starter balance buys several hints", STARTER_CRYSTALS >= HINT_CRYSTAL_COST * 3);
check("a passed task always pays something", TASK_PASS_CRYSTAL_REWARD > 0);
check("a hint is never free by accident", HINT_CRYSTAL_COST > 0);

console.log(`\nECONOMY INVARIANTS: ${failed === 0 ? "all passed" : "FAILURES"} (${failed} failed)`);
process.exit(failed === 0 ? 0 : 1);
