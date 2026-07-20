# Child solo journey — one-time parent code + fully-guided gamified path (v2)

**Date:** 2026-07-19 (v2 — simplified & expanded per CEO direction 2026-07-20)
**Status:** Draft — awaiting CEO review (brainstorming-skill gate, no implementation yet)
**Supersedes:** v1 (async email-approval + polling + ticket). v1's parent-email round-trip was too
heavy; CEO: *"родитель 1 раз дал код, ребёнок через этот код проходит и дальше действует… не надо
усложнять… мы не в Европе, это тестовый продукт, он не должен мучать."*
**Related:** [docs/COPPA-CONSENT-SPEC.md](../../COPPA-CONSENT-SPEC.md) — the safety architecture
(`hasValidConsent()` fail-closed) is **kept**; this spec only changes how a session + consent get
created, and adds the guided/gamified runtime the child walks through alone.

---

## 0. The one decision that is the CEO's (legal posture)

Everything below assumes **the one-time code IS the parental-consent artifact**: when an invited
parent is handed a code, that hand-off is the parental authorization; redeeming it marks consent
valid. This keeps the existing fail-closed safety gates intact while collapsing the *child-facing*
friction to "type one code." The only open call is **how much consent ceremony to keep on the
parent side** (test product, not-EU, per CEO):

- **(A) Zero ceremony** — the code alone is consent. Child types code → in. We log issuance +
  redemption (who, when, IP) as the consent record. Lightest; matches "родитель 1 раз дал код"
  literally.
- **(B) One parent screen at activation** — parent opens a short link once (out of the child's
  way), ticks the two existing opt-ins, gets the code. Slightly more defensible, still zero
  child friction.

This is a legal-posture choice, not an engineering one — flagged for the CEO. The rest of the
design is identical either way. Default assumption if unspecified: **(A)** for the closed test.

## 1. Confirmed decisions (CEO)

1. Child gets their own link; parent never sits at the child's device.
2. Child starts and finishes **alone** — no "папа, помоги зайти" moments.
3. Access = **one code the parent gives once** (not an email dance).
4. Closed test, allowlist-backed; not EU-grade ceremony; must not "torture" the child.
5. Guide the child every step: popups, arrows, hints, gamification.
6. Ending = **certificate + the monster they raised**.
7. Session tech = Clerk sign-in ticket (server mints, child's browser silently consumes).

## 2. Access model — one-time parent code (replaces v1's email round-trip)

**Issuance.** The CEO/admin generates a batch of codes, each tied to an allowlisted parent email
(from `ALLOWLIST_EMAILS` / a codes table). Parent receives the code out-of-band (WhatsApp, in
person — however the closed test invites go out) and hands it to the child once.

**Kid-friendly redemption** (patterns from Kahoot 6-digit PIN, ClassDojo class code, Prodigy
"enter once"):
- Segmented OTP-style input — one big box per character, auto-advance, paste-friendly.
- **Codes exclude ambiguous chars** (no `0/O`, `1/I/L`) — ClassDojo's documented failure mode.
- Numeric-first if we go all-digits (`inputmode="numeric"`); case-insensitive; whitespace trimmed.
- **QR alternative** so a parent can scan on their phone and pre-fill — child types nothing.
- **Entered at most once, then remembered** (cookie/session) — Prodigy's "don't re-ask" rule.
- Wrong code → friendly retry line in the monster's voice, never a red "ERROR".

**What redemption does (server):**
1. Validate code (hash+salt compare, not-expired, not-already-redeemed).
2. Find-or-create the family's Clerk user (via `@clerk/backend` `clerkClient.users`), keyed to the
   issuance email.
3. Mark the code redeemed; **record consent** for that `clerkId` (from issuance — posture A/B above).
4. Mint a Clerk **sign-in ticket**; return it to the child's browser.
5. Child client calls `signIn.create({strategy:"ticket", ticket})` → real session → straight into
   the journey. No password, no form, no parent present.

**Safety architecture unchanged:** every gated route still calls fail-closed `hasValidConsent()`.
Redemption simply becomes a new, lighter way to reach the "consent valid" state that the app
already handles first-class.

## 3. The guided journey — never a "what do I do now?" moment

Global rule (NN/g: kids abandon after a few failed tries; they skip long text): **every screen has
(a) a visible mascot, (b) exactly one glowing/pulsing next target, (c) a spoken line + a one-line
caption, (d) an idle safety-net that re-teaches.** No silent, text-heavy, or blank screens.

**Reusable guidance primitives to build once, use everywhere:**
- **Mascot voice + caption** — short pre-recorded (or `SpeechSynthesis` fallback) line auto-played
  on each step-enter, with a one-line caption + icon. Reading is optional, not required
  (Khan Academy Kids, Duolingo ABC narrate everything).
- **Pulsing "tap here" affordance** — an absolutely-positioned pulsing ring / bouncing hand over
  the current target; CSS `@keyframes`, respects `prefers-reduced-motion`. Language-independent
  (Mobile-game onboarding standard).
- **Step-gating** — only the current step's control is enabled; the rest dimmed
  (`pointer-events:none` + reduced opacity). Advance on a `stepComplete` state flag, not a
  mis-pressable "Next" button. (Duolingo ABC: each game unlocks the next; open free-navigation
  makes kids "get lost and leave.")
- **Modeless coachmarks (≤3, one at a time)** — spotlight the *real* control the child then acts
  on (playthrough, not passive tooltip). `driver.js`/`react-joyride`-style, or a custom masked
  backdrop. Trigger on state ("has hatched?"), not session count. Stacked coachmarks = anti-pattern.
- **Idle nudge (escalating)** — idle timer resets on `pointerdown`/`keydown`. ~6s → pulse the
  target; ~15s → mascot replays the voice line; further → bigger hand / "let me show you" demo.
  Ceiling ~3 nudges so it never feels "managed."
- **Big forgiving targets** — ≥~64px hit areas, generous spacing, single-tap everything, no
  hover/right-click/drag-precision required (NN/g touch-target sizing for kids).

**Annotated first-run, land → certificate:**

| Beat | What the child sees | Guidance mechanic |
|---|---|---|
| **Land (0–5s)** | Animated mascot, one giant pulsing button. Voice: "Привет! Давай разбудим твоего монстра." No login wall. | mascot voice+caption, pulsing CTA, idle armed |
| **Enter code** | Big segmented code boxes (or QR). Voice: "Впиши секретный код от родителя." Inline friendly validation. | kid code input, big targets, forgiving retry |
| **Hatch (first win)** | Egg with a pulsing "tap!" ring; tap → hatch animation + sound + the monster's name prompt. | step-gating, pulse cue, micro-celebration |
| **Name & color** | Child names the monster, picks a color/trait (big choice cards, no free-text walls). | autonomy = ownership; choice chips not fields |
| **Micro-tour → Lesson 1** | ≤3 spotlights on the real prompt box / send button, child acts on each. | modeless coachmarks, one mechanic per step |
| **Lessons 1–5** | One objective each; write a prompt → monster reacts & learns → reflection beat. | step-gating, idle nudge, per-correct sparkle |
| **Each lesson end** | Confetti + monster **evolves one visible stage**, gains a trait tied to the skill. | milestone celebration (reserved), unlock |
| **Course end** | Big celebration; monster's final form; **certificate + keepsake card**. | see §6 |

The child is *dropped into doing*, account/consent already handled by the code — so the entire
interior is play, guided at every step.

## 4. Gamification & progression (research-backed, SDT: autonomy / competence / relatedness)

- **Progress-as-competence, not a point counter.** A 5-node course map with the monster walking
  it; the visible spine is skill, not XP. (SDT meta-analysis: gamification reliably lifts autonomy
  & relatedness but usually *fails* to raise competence — so make skill-growth the visible thing.)
- **Endowed head-start.** Lesson 1 opens with the progress bar already ~15–20% full ("твой монстр
  уже вылупляется") — Nunes & Drèze goal-gradient: a pre-filled bar ⇒ far higher completion.
- **Monster = the reward, and it's intrinsic.** The monster **evolves as a function of skills
  learned** (Khan Kids collectibles-by-mastery model), not coins/logins. Because the lesson topic
  *is* "train your AI," the monster getting smarter as prompts improve fuses narrative + mechanic.
  This side-steps the overjustification trap (external bribes cut kids' intrinsic motivation).
- **Autonomy hooks:** child names the monster and picks its color/trait at the start — ownership.
- **Relatedness for a solo kid:** the monster is the companion (Tamagotchi "it needs me" circuit)
  — the reason a child alone keeps going. **But no neglect/death/illness mechanic** (undue pressure
  on an 8-year-old).
- **Celebration cadence (reserved, so it stays meaningful):** small in-line sparkle + monster cheer
  + soft sound per correct answer; **full `canvas-confetti` + sound sting only at lesson- and
  course-complete.** (Juice-overload research: confetti-on-everything habituates to noise.) Sound
  toggleable / off by default (school-friendly).
- **Unlocks, not streaks.** Each lesson's reward is an unlock the child opens (autonomy). **No
  daily streaks, no loss-aversion counters** — see §7.

## 5. Wrong-answer UX — shame-free, teaching, unlimited

- **No lives, no fail-out, unlimited retries.** (Duolingo is *removing* Hearts in 2025 because
  losing a life per error made beginners 2× more likely to run out mid-lesson and discouraged the
  trial-and-error that *is* learning.)
- **Progressive elaborative hints (productive failure):** 1st miss → reframe + nudge ("почти! а
  что, если сказать монстру, *какой именно* ответ ты хочешь?"); 2nd → worked hint; 3rd → reveal +
  let the child re-enter it to feel the win. Feedback explains *why*, not just "correct answer is X"
  (the exact gap critics flag in Prodigy).
- **Praise the process, never the person** — "классная стратегия / ты сам это починил", **not**
  "какой ты умный" (person-praise backfires at the next setback — growth-mindset research).
- Reuses the AI tutor's existing gentle-refusal voice, now applied to pedagogy — same tone, and it
  already fails safe on unsafe input.

## 6. Completion — certificate + monster keepsake

- **Auto-offer the certificate the instant Lesson 5 is done** (Code.org's exact pattern — the
  strongest real precedent for kid certificates at scale).
- **Personalized:** child's name **+ their named monster co-starring**, a plain credential
  ("Prompt Engineer — Level 1"), and a short "теперь я умею…" list.
- **Printable + downloadable, no login, no paywall:** render an HTML/SVG template → `@vercel/og`
  (satori) for a 300-DPI PNG; print-CSS / `jsPDF` for the PDF. (`canvas-confetti` is already a dep.)
- **Monster keepsake:** at completion the monster **graduates to its final evolved form** and the
  child downloads a **monster card** ("[Имя монстра], воспитан [Имя ребёнка]") — the evolution is
  the visual proof of everything learned.
- **Sharing is parent-gated**, off the downloaded file — never a child posting to a public feed
  (privacy + COPPA).
- **Reveal, don't dangle.** The certificate/monster are shown as recognition at the end — **never
  advertised up front as "finish to earn it"** (the overjustification bribe, whose original 1973
  form was literally a gold-seal certificate).

## 7. Anti-patterns we explicitly avoid (kids' product)

Streaks / loss-aversion counters · hearts / lives / fail-out · loot boxes / **random monster
hatching** (deterministic, earned evolution only) · pay-to-win / paywalled progress (monster +
certificate fully free) · guilt-trip notifications · public child sharing / leaderboards ·
person-praise ("ты умный") · dangling the reward up front · juice-on-everything · walls of text ·
stacked coachmarks · tap-through age gates · ambiguous/expiring codes.

## 8. Technical impact — reuse vs. new

**Reused as-is:** `hasValidConsent()` + all fail-closed gates; `ALLOWLIST_EMAILS`; Clerk
sign-in-ticket approach (v1); Monster model + `MonsterAvatar` moods; `canvas-confetti` +
`framer-motion` (already deps); lessons 1–5; rewards/progression seams.

**New:**
- `AccessCode` table (`codeHash`, `salt`, `issuedForEmail`, `status`, `redeemedByClerkId?`,
  `consentCapturedAt`, `expiresAt?`) — replaces v1's `AccessRequest`.
- `POST /api/access-code/redeem` (public, rate-limited) → validate → find/create Clerk user →
  record consent → mint ticket. Admin code-generation script/route (CEO-only).
- Guidance primitives (§3): mascot voice+caption, pulsing target, step-gating wrapper, coachmark
  spotlight, idle-nudge hook — a small shared UI kit.
- Monster **evolution stages** (derive form from `skillsCompleted`).
- Wrong-answer **progressive-hint** escalation in the lesson chat UI.
- Certificate generation (`@vercel/og` PNG + PDF) + monster keepsake card.
- Landing (`src/app/page.tsx`) reframed: child-first primary action; parent sign-in demoted to a
  small secondary link.
- Add `@clerk/backend` as a direct pinned dependency (currently only transitive).

**Migration:** `AccessCode` via `prisma migrate diff --from-empty --to-schema … --script` →
`scripts/turso-db-push.mjs` (the established libSQL-adapter workaround). No new required env
beyond existing (`ALLOWLIST_EMAILS`, `CONSENT_CODE_PEPPER`, `RESEND_*`).

## 9. Non-goals (this iteration)

- No open self-serve registration — stays code/allowlist-gated (closed test).
- No push notifications, no streaks, no social feed, no paid tiers.
- Not translating lessons to AZ in this pass (tracked separately; landing/consent already bilingual,
  lesson interior currently RU-only).
- One code → one child profile (1:1), same as today.

## 10. Research basis (real products, not invented)

Access: Kahoot PIN, ClassDojo class code, Prodigy "enter once". Guidance: Duolingo/Duolingo ABC
(play-first, audio-first, step-gating), Khan Academy Kids (mascot narration, collectibles-by-
mastery), NN/g children's UX (targets, abandonment), coachmark/idle-nudge UX research. Motivation:
Self-Determination Theory meta-analysis, overjustification effect (Deci/Koestner/Ryan; Lepper),
goal-gradient/endowed-progress (Nunes & Drèze), Tamagotchi effect, Duolingo hearts→energy change,
loot-box harm research. Completion: Code.org certificates. Full source URLs captured in the
research pass (2026-07-20); to be appended as a references block when this spec is approved.
