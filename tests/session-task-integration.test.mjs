import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const page = readFileSync(join(root, "src/app/session/[id]/page.tsx"), "utf8");
const workspace = readFileSync(
  join(root, "src/components/curriculum/task-surfaces/TaskWorkspace.tsx"),
  "utf8"
);
const browserSuite = readFileSync(join(root, "tests/e2e/current-session-ui.mjs"), "utf8");

assert.match(page, /import \{ TaskWorkspace \}/, "current session imports TaskWorkspace");
assert.match(page, /type \{ StructuredProgram \}/, "current session uses the closed program type");
assert.match(page, /const \[offeredTier, setOfferedTier\]/, "route tier is stored");
assert.match(page, /offeredTier\?: 1 \| 2 \| 3/, "session response types offeredTier");
assert.match(page, /setOfferedTier\(body\.offeredTier \?\? 1\)/, "route tier reaches state");
assert.match(page, /program\?: StructuredProgram/, "runAttempt accepts a structured program");
assert.match(page, /program: opts\.program/, "structured program crosses the normal attempt boundary");
assert.match(page, /<TaskWorkspace[\s\S]*onSubmit=\{\(program\) => void runAttempt\(\{ program \}\)\}/, "workspace submits through runAttempt");
assert.match(page, /<details[\s\S]*Сказать своими словами[\s\S]*task-utterance/, "free text is a secondary disclosure");
assert.match(page, /role="status"[\s\S]*aria-live="polite"[\s\S]*aria-atomic="true"/, "feedback is announced atomically");
assert.match(workspace, /reference\?: ReactNode/, "workspace accepts visible task reference data");
assert.match(workspace, /\{reference\}[\s\S]*<WorkedExample/, "reference data precedes the worked example");
assert.doesNotMatch(browserSuite, /\/api\/tasks\/attempt|passingChoiceId|programForChoice/, "browser suite never completes through an API or canonical choice helper");
assert.match(browserSuite, /SESSION_IDS[\s\S]*w5-s3/, "browser suite declares all 15 current sessions");
assert.match(browserSuite, /viewport: \{ width: 320/, "browser suite includes 320px mobile evidence");
assert.match(browserSuite, /keyboard\.press\("Space"\)/, "browser suite verifies keyboard interaction");
assert.match(browserSuite, /hasDevTestBypass[\s\S]*"production"/, "browser suite rejects production bypass semantics");

console.log("session-task-integration: current /session structured path contract passes");
