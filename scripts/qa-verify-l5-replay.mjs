#!/usr/bin/env node
/**
 * QA verify: does RE-completing lesson 5 pop a zero-reward modal?
 * Reset test user → complete L1..L5 in order (real rewards) → re-send L5 correct.
 * If the replay returns a NON-NULL rewardTotals, modalShouldOpen() fires a "выполнено"
 * popup for a reward that was never granted. Prints the verdict.
 */
process.loadEnvFile(new URL("../.env", import.meta.url));
const BASE = process.env.BASE_URL || "http://127.0.0.1:3000";

const CORRECT = {
  1: "храбрый, быстрый и весёлый",
  2: "пой весёлые песенки и добавляй огонёк к каждому слову",
  3: "заменяй все гласные буквы на звёздочки",
  4: "нет, это не кошка, это собака — исправь распознавание",
  5: "если впереди стена, то поверни налево, иначе иди вперёд",
};

async function chat(step, text, eventId) {
  const body = {
    messages: [{ sender: "monster", text: "intro" }, { sender: "user", text }],
    activeStepId: step, activeSkin: "🐲", activeMonsterName: "Искра", eventId,
  };
  const r = await fetch(BASE + "/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-test-bypass": "true" },
    body: JSON.stringify(body),
  });
  return r.json();
}

// reset test user directly
const { prisma } = await import("../src/lib/prisma.ts");
const u = await prisma.user.findUnique({ where: { clerkId: "test_user_id" } });
if (u) {
  await prisma.rewardEvent.deleteMany({ where: { userId: u.id } });
  await prisma.user.delete({ where: { id: u.id } });
}
console.log("[reset] test_user_id cleared");

// complete L1..L5 in order (advance activeStep each time)
for (let s = 1; s <= 5; s += 1) {
  const j = await chat(s, CORRECT[s], `qa-first-${s}`);
  console.log(`L${s} first: pass=${j.challengeCompleted} rewardTotals=${JSON.stringify(j.rewardTotals)}`);
}

// now re-send L5 (already completed, activeStep is clamped at 5 → gate fires)
const replay = await chat(5, CORRECT[5], "qa-replay-l5");
console.log(`\nL5 REPLAY: pass=${replay.challengeCompleted} rewardTotals=${JSON.stringify(replay.rewardTotals)}`);

// modalShouldOpen(challengeCompleted, rewardTotals): true when both truthy
const { modalShouldOpen } = await import("../src/lib/progression.ts");
const wouldOpen = modalShouldOpen(replay.challengeCompleted, replay.rewardTotals);
console.log(`\nVERDICT: modalShouldOpen on L5 replay = ${wouldOpen}` +
  (wouldOpen ? "  <-- BUG: zero-reward 'выполнено' modal fires on replay" : "  (ok: no modal on replay)"));
process.exit(wouldOpen ? 1 : 0);
