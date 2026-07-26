// Closes the loop the fixtures cannot: is the monster's diff *actionable*? A checker can be
// perfectly correct and still teach nothing.
//
// A model role-plays a nine-year-old who can see the target picture, describes it to the
// monster, receives the diff, and tries again. The interpreter still never sees the target —
// only the synthetic child does.
//
// Read the result as a bound, not a prediction: a language model pretending to be nine is far
// more articulate and far less distractible than a real child. If it converges in N attempts,
// a real child needs more. If it CANNOT converge, the feedback is unusable and no real child
// will do better. The second reading is the one worth having.

import { readFileSync } from "node:fs";
import { families } from "./lib/families.mjs";
import { makeClient, interpret } from "./lib/interpreter.mjs";
import { GRID_SIZE, execute, check, renderDiff } from "./lib/grid-draw.mjs";
import { makeTarget, referabilityCost } from "./lib/targets.mjs";

if (process.env.SPIKE_ENV_FILE) {
  for (const line of readFileSync(process.env.SPIKE_ENV_FILE, "utf8").split(/\r?\n/)) {
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2];
  }
}

const MAX_TURNS = Number(process.env.SPIKE_MAX_TURNS ?? 6);
const TARGETS_PER_TIER = Number(process.env.SPIKE_TARGETS ?? 4);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CHILD_SYSTEM = `Тебе девять лет. Ты играешь в игру с монстром.
Ты видишь картинку: какие клетки на поле надо закрасить. Монстр картинку НЕ видит.
Твоя задача — сказать монстру словами, что закрасить, чтобы получилось как на картинке.

Говори как настоящий ребёнок девяти лет: короткими простыми фразами, без слов «координаты» и «массив».
Не пиши ничего кроме самой фразы для монстра. Никаких пояснений, никаких кавычек.
Если монстр показал, что получилось не так, скажи по-другому, точнее.`;

function renderTarget(target) {
  const keys = new Set(target.map(([r, c]) => `${r},${c}`));
  const lines = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    const cells = [];
    for (let col = 0; col < GRID_SIZE; col++) cells.push(keys.has(`${row},${col}`) ? "\u25A0" : "\u00B7");
    lines.push(cells.join(" "));
  }
  return lines.join("\n");
}

async function askChild(conn, history) {
  const response = await conn.client.chat.completions.create({
    ...conn.extra,
    model: conn.model,
    messages: history,
    temperature: 0.7,
    max_tokens: 120,
  });
  return String(response.choices?.[0]?.message?.content ?? "").trim().replace(/^["«]|["»]$/g, "");
}

async function playOne(conn, family, target) {
  const history = [
    { role: "system", content: CHILD_SYSTEM },
    {
      role: "user",
      content: `Поле ${GRID_SIZE} на ${GRID_SIZE}. Вот картинка, которую надо получить:\n${renderTarget(target)}\n\nСкажи монстру, что закрасить.`,
    },
  ];

  const transcript = [];
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    const utterance = await askChild(conn, history);
    history.push({ role: "assistant", content: utterance });
    await sleep(250);

    let program;
    try {
      ({ program } = await interpret(conn, family, utterance));
    } catch (error) {
      transcript.push({ turn, utterance, outcome: `interpreter error: ${error.message}` });
      break;
    }
    await sleep(250);

    if (program.status !== "ok") {
      const complaint = `Я не понял, что закрасить. ${program.reason ?? ""} Скажи точнее.`;
      transcript.push({ turn, utterance, outcome: `unclear: ${program.reason ?? ""}` });
      history.push({ role: "user", content: complaint });
      continue;
    }

    const result = execute(program);
    const verdict = check(result, target);
    const diff = renderDiff(result, target, verdict);
    transcript.push({ turn, utterance, outcome: verdict.pass ? "solved" : `missing ${verdict.missing.length}, extra ${verdict.extra.length}` });
    if (verdict.pass) return { solved: true, turns: turn, transcript };
    history.push({ role: "user", content: `Монстр сделал так:\n${diff}\n\nПопробуй сказать по-другому, точнее.` });
  }
  return { solved: false, turns: MAX_TURNS, transcript };
}

async function run() {
  const conn = makeClient(process.env.SPIKE_PROVIDER ?? "gemini");
  const family = families["grid-draw"];
  console.log(`\nprovider: ${conn.provider}   model: ${conn.model}   max turns: ${MAX_TURNS}\n`);

  const results = [];
  const TIERS = (process.env.SPIKE_TIERS ?? "1,2,3").split(",").map(Number);
  for (const tier of TIERS) {
    for (let i = 0; i < TARGETS_PER_TIER; i++) {
      const seed = tier * 1000 + i + 1;
      const target = makeTarget(tier, seed);
      const outcome = await playOne(conn, family, target);
      results.push({ tier, seed, cost: referabilityCost(target), ...outcome });

      console.log(`tier ${tier} seed ${seed}  (${outcome.solved ? `solved in ${outcome.turns}` : `UNSOLVED in ${MAX_TURNS}`})`);
      for (const line of outcome.transcript) {
        console.log(`   ${line.turn}. «${line.utterance}»`);
        console.log(`      -> ${line.outcome}`);
      }
      console.log("");
    }
  }

  const solved = results.filter((r) => r.solved);
  const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  console.log("=== result ===");
  console.log(`  solved            ${solved.length}/${results.length}`);
  console.log(`  mean turns        ${mean(solved.map((r) => r.turns)).toFixed(2)} (solved only)`);
  for (const tier of TIERS) {
    const forTier = results.filter((r) => r.tier === tier);
    const solvedTier = forTier.filter((r) => r.solved);
    const attempts = mean(forTier.map((r) => r.turns));
    console.log(
      `  tier ${tier}            ${solvedTier.length}/${forTier.length} solved, mean attempts ${attempts.toFixed(2)}, cost of saying it ${mean(forTier.map((r) => r.cost)).toFixed(1)}`
    );
  }
  const unsolved = results.filter((r) => !r.solved);
  if (unsolved.length) console.log(`  unsolved seeds    ${unsolved.map((r) => `${r.tier}/${r.seed}`).join(", ")}`);
  console.log("");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
