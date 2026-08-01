/**
 * W5 kill-switch drill: AI_KILL_SWITCH=1 -> interpreter_down -> choice-mode completes.
 * Local / in-process only. Transcript under docs/release/_w5_drill_workspace/.
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);

process.env.AI_KILL_SWITCH = "1";
delete process.env.FAKE_AI_MODE;

const { getFakeAiMode, isAiKillSwitchOn, shouldUseFakeInterpreter } = require(
  join(root, "src/lib/fake-ai.ts")
);
const { programForChoice, passingChoiceId, buildChoiceOptions } = require(
  join(root, "src/lib/tasks/choice-mode.ts")
);
const { resolveGridAttempt } = require(join(root, "src/lib/tasks/attempt.ts"));
const { getSession } = require(join(root, "src/content/curriculum/index.ts"));

const outDir = join(root, "docs/release/_w5_drill_workspace");
mkdirSync(outDir, { recursive: true });

const lines = [];
function log(msg) {
  lines.push(msg);
  console.log(msg);
}

log("# W5 kill-switch drill transcript");
log(`timestamp: ${new Date().toISOString()}`);
log(`AI_KILL_SWITCH env: ${process.env.AI_KILL_SWITCH}`);
log(`isAiKillSwitchOn: ${isAiKillSwitchOn()}`);
log(`getFakeAiMode: ${getFakeAiMode()}`);
log(`shouldUseFakeInterpreter: ${shouldUseFakeInterpreter()}`);

const modeOk = getFakeAiMode() === "interpreter_down" && isAiKillSwitchOn();
log(`gate: kill-switch forces interpreter_down → ${modeOk ? "PASS" : "FAIL"}`);

const session = getSession("w1-s1");
if (!session) {
  log("FAIL: session w1-s1 missing");
  writeFileSync(join(outDir, "kill-switch-transcript.md"), lines.join("\n") + "\n", "utf8");
  process.exit(1);
}
const task = session.tasks.find((t) => t.family === "grid-draw") ?? session.tasks[0];
const choices = buildChoiceOptions(task);
const passId = passingChoiceId(task);
const prog = programForChoice(task, passId);
const outcome = resolveGridAttempt(prog, task.target, {
  hideTargetPanel: task.role === "collision",
});

log(`session: ${session.id} task: ${task.id}`);
log(`choices: ${choices.length}`);
log(`passingChoiceId: ${passId}`);
log(`choice-mode pass: ${outcome.pass === true ? "PASS" : "FAIL"}`);

const allOk = modeOk && outcome.pass === true && choices.length >= 2;
log(`DRILL_RESULT: ${allOk ? "PASS" : "FAIL"}`);

const path = join(outDir, "kill-switch-transcript.md");
writeFileSync(path, lines.join("\n") + "\n", "utf8");
console.log("Wrote", path);
process.exit(allOk ? 0 : 1);
