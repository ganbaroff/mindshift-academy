# MindShift Academy — Design Brief v1 (consolidated)
Consolidated 2026-09-05 from 6 research reports + live repo state (`src/app/globals.css`, `src/components/curriculum/task-surfaces/TaskWorkspace.tsx`, `src/lib/tasks/stuck.ts`). Branch `owner/experience-rebuild`.

## 0) Review verdicts — the two unreviewed reports

**evidence-kids-ux.md — ACCEPTED, 9/10.** Spot-checked its two most load-bearing citations via WebFetch this pass: NN/g's *Children's UX* article confirmed verbatim ("distinguish between young (3–5), mid-range (6–8), and older (9–12) children"; "Font size: 14 point (young children), 12 point (older children)"; paragraph-skipping observed directly), and WCAG SC 2.2.2 confirmed as Level A with an explicit attention-deficit rationale. Both match the report's claims exactly — no drift. This is the most rigorously sourced of the six reports (normative specs + a primary usability study, not marketing pages); its only real weakness is three blocked fetches (ICO, McNeese PDF, Common Sense Media PDF) honestly demoted to search-snippet reconstruction and flagged UNVERIFIED rather than asserted as fact.

**live-tokens.md — ACCEPTED, 8/10.** Live `getComputedStyle` measurement against 5 real sites beats vendor claims, and its concrete recommendations (48px buttons, split card/button radius, 1.5 line-height) are checked against `globals.css` below and mostly hold up. Two accuracy gaps found in this pass: it lists body line-height as "not set… raise to 1.5," but `globals.css:121` already sets `line-height: 1.5` on `body` — the report treats the file as blanker than it is. It also states current button min-height is "44px," but `globals.css:205-209` only applies that floor inside `@media (pointer: coarse)` — there is no unconditional 44px floor today, which is a real gap, not the non-issue the report implies.

## 1) 12 principles for an 8–11 learning UI

1. **Target the top of the band (9–12 patterns), not a generic "kids app."** Scanning replaces careful reading here. *NN/g, verified this pass — Strong.*
2. **One goal line, ≤6–8 word instructions, no paragraphs.** *Uchi.ru Habr field data + NN/g paragraph-skipping — Strong, convergent.*
3. **Icon/worked-example-first instruction over prose for non-fluent readers.** *ScratchJr (MIT Media Lab), DragonBox manipulatives — Strong, research-grounded.*
4. **Persistent, low-key companion that normalizes asking for help**, not just decoration. *Khan Academy Kids tap-if-stuck character; Duolingo state-machine reactions — Strong/Moderate.*
5. **Zero-penalty, auto-presented retry naming what specifically failed.** *Kodable "redo"; Uchi.ru concreteness fix; Codecademy execution-based feedback — Strong (Uchi.ru has measured field data).*
6. **Non-punitive incorrect state: warm tone, no red/alarm, no verdict-first copy.** *Duolingo design rationale — Moderate (design rationale, not a controlled study).*
7. **Praise names the exact action taken, never generic or comparative.** *Uchi.ru (−66% error via concreteness); blog.rt.ru (ranking-language risk) — Strong for concreteness, Moderate for anti-ranking.*
8. **Explicit tap at every task/session boundary — no autoplay.** *Udemy-autoplay verdict=NO; EU Digital Fairness Act consultation — Moderate (advocacy + comparison reasoning).*
9. **Primary touch targets ≥48px**, above WCAG's 24px floor and Apple's 44pt adult minimum. *WCAG SC 2.5.8 (verified normative); Khan Academy Kids' measured 48px — Strong + Moderate (n=1 competitor).*
10. **Looping/auto-start animation must settle to static after a bounded cycle, independent of `prefers-reduced-motion`.** OS-level reduced-motion is opt-in; SC 2.2.2 is Level A and unconditional. *WCAG SC 2.2.2 — verified this pass — Strong.*
11. **Progress as a personal path/map, never a cross-child leaderboard.** *Brilliant "Level Gameboard"; Khan Academy Kids path metaphor; blog.rt.ru; screenwiseapp.com — Strong, US+RU convergence.*
12. **No loss-framed mechanics** (streak-reset-to-zero, wagers, urgency countdowns). *ICO Age Appropriate Design Code Standard 13 (binding UK statutory code, page itself blocked/reconstructed — treat citation as Moderate-Strong); Duolingo streak-anxiety documentation — Strong.*

## 2) Token set v2

| Token | Current (`globals.css`) | Proposed | Why (source) |
|---|---|---|---|
| Body font-size, desktop | `16px` (line 120) | keep `16px` | live-tokens.md 5-site median; NN/g 12pt-for-9–12 floor ≈16px screen |
| Body font-size, mobile | `16px` (forced at ≤768px, line 196, to stop rem-shrink) | keep `16px`, never lower | iOS auto-zoom threshold; live-tokens.md competitor floor |
| Body line-height | `1.5` (line 121 — **already matches** live-tokens.md's ask; that report is wrong to call it unset) | keep `1.5` | Brilliant/Coursera 1.5×; safer for ADHD/dyslexia-adjacent readers |
| H2 desktop | not a sized token — h2 only inherits `--font-baloo` family (line 144) | new: `28px / 700` | live-tokens.md: between Coursera's 28px and Khan Kids' 16px, below Brilliant/uchi.ru's marketing-scale extremes |
| H2 mobile | none | new: `22px / 700` | proportional step observed across all 5 sites |
| H1 desktop | none (family only) | new: `40px / 700` | live-tokens.md cross-site median |
| H1 mobile | none | new: `30px / 700` | proportional step |
| Button radius | `~1rem`/16px via Tailwind `rounded-2xl`, no dedicated var | keep 16px, promote to explicit `--radius-button` | live-tokens.md "structured" cluster (Duolingo 12, Khan Kids 12, uchi.ru 16) matches MindShift already |
| Card radius | same shared classes as buttons (`.rounded-2xl/-3xl/-[28px]` only get `box-shadow`, no distinct radius) | new: `--radius-card: 20px`, split from button | Brilliant's 20px card; softer-than-button reads friendlier for this cohort |
| Button min-height | `44px`, but **only** inside `@media (pointer: coarse)` (lines 205–209) — no unconditional floor | `48px`, unconditional across all pointer types | live-tokens.md: Khan Academy Kids (only same-audience competitor) uses 48px; kids have worse tap precision than the adult HIG baseline |
| Spacing base | no explicit scale; Tailwind default | confirm/adopt 8px grid intentionally | live-tokens.md: 16/20/24/32 across all 5 sites divide cleanly by 8 |
| Shadow | `--shadow-card`, `--shadow-pop` already ink-tinted (`rgba(43,35,32,…)`, lines 17–18) | **keep, no change** | live-tokens.md independently recommends a self-color-tinted shadow (uchi.ru pattern) — MindShift already ships this; strongest confirmation in the brief that current direction is right |
| Motion, micro (press) | `--duration-press: 160ms` (line 25) | keep 160ms | live-tokens.md suggests 200ms; 160ms is in the same tier and already shipped — no change needed |
| Motion, standard (panel) | none named beyond `rise-in`/`pop-from-corner` | new: `--duration-standard: 300ms` | live-tokens.md: Coursera + uchi.ru both measured at 0.3s resting-state |
| Easing | `--ease-out`, `--ease-in-out` (Emil Kowalski curves, lines 23–24) | **keep, do not replace** | live-tokens.md's generic Material ease-out is weak-signal (n=2); the shipped curves already have a documented rationale in-file |
| Reduced-motion rule | global blanket kill + two fade-overrides for `rise-in`/`pop-from-corner` (lines 152–173) | extend the same fade-override pattern to the monster's thinking/celebration states and `part-grow`; add a settle-after-≤3-cycles rule for any idle loop, independent of the media query | evidence-kids-ux.md rows 8–9 (WCAG SC 2.2.2 is Level A and not satisfied by an opt-in OS setting alone — verified this pass) |
| Contrast — `--text-primary` | `#2B2320` on `#FBF1E0` ≈ 13.7:1 | keep, no risk | — |
| Contrast — `--text-muted` | `rgba(43,35,32,.66)` ≈ **4.8:1**, only 0.3 over the 4.5 AA floor | recompute per each of the 5 new world-theme backgrounds (commit `7e77063`) before shipping; bump toward `--text-secondary`'s `.72` opacity on any theme that drops below ~4.6:1 | evidence-kids-ux.md row 11, task-brief-flagged risk |

## 3) Screen-by-screen spec

**Session intro** — order: goal line → one icon/animated demo → primary CTA. Text blocks: 1 (+1 optional collapsed disclosure). Instruction cap: ≤8 words. Animation: `rise-in`, on mount, 200ms. Companion: idle/greeting. Remove: any prose paragraph before the CTA (ScratchJr/Khan Kids pattern).

**Task screen (default collapsed)** — order: family title → one instruction line or worked example → input surface → primary action; disclosure collapsed. Text blocks: 1 instruction (+ tier-1 reminder line only at tier 1, per `TIER_ONE_REMINDERS`). Instruction cap: ≤8 words. Animation: `pop-from-corner` on disclosure open, 160ms. Companion: idle → thinking (existing) → stuck-notice (server-gated by `stuck.ts`, same bubble style, not a modal). Remove: nothing structural — `TaskWorkspace.tsx` already collapses the disclosure; audit only that `FAMILY_TITLES` headers don't duplicate the instruction line.

**Feedback fail** — order: monster reaction → one concrete failure-part line → auto-presented retry CTA. Text blocks: 1. Instruction cap: ≤10 words, verdict never the first word. Animation: new distinct "incorrect" state (currently reuses "thinking" per `e3ffd46` — split it), ~300ms, no overshoot. Companion: incorrect (new). Remove: red/alarm color, generic "Ошибка"/"Неправильно" as a leading word.

**Feedback pass** — order: celebration → specific-action praise line → reward count (if any) → next-task CTA. Text blocks: 1. Instruction cap: ≤8 words, exclamation reserved here only. Animation: celebration (existing `e3ffd46`), counter tick synced 1:1 to the number. Companion: celebrate. Remove: generic "Молодец!" not naming the action.

**Session complete** — order: session recap on the path → celebration reprise (quieter than per-task) → one summary line → return-to-map CTA. Text blocks: 1. Instruction cap: ≤10 words. Animation: branded loading-beat instead of a spinner for any transition delay. Companion: celebrate → idle. Remove: any loss-framed streak language; no autoplay into the next session.

**Map** — order: 5-week×3-session path, current/completed/upcoming states. Text blocks: 0–1. Instruction cap: ≤6 words if present. Animation: one-time path-reveal on load; current-node pulse bounded to ≤3 cycles then static (SC 2.2.2 / ADHD principle). Companion: idle, at current node. Remove: flat-grid remnants, any cross-child marker.

**Parent dashboard** — order: one mastery-tethered insight line ("what your child struggled with this week," from judge failure categories) → weekly email link → consent/safety status → per-topic detail behind a tap. Text blocks: 1 headline + detail behind disclosure. Register: вы, formal (adult-facing). Animation: standard 300ms panel transition only. Companion: absent or a small static badge — parent surface is a distinct product (Kodable pattern), not the child UI. Remove: child-facing gamification visuals; the Prodigy-Parent "thin aggregate only" failure mode.

## 4) Motion vocabulary

| Name | Trigger | Duration | Easing | Meaning | Reduced-motion fallback |
|---|---|---|---|---|---|
| rise-in | message/monster arrives | 200ms | `--ease-out` | something new appeared | fade only, existing rule |
| pop-from-corner | panel opens from its trigger | 160ms | `--ease-out` | this grew from what you tapped | fade only, existing rule |
| part-grow | monster gains a new part | 620ms | `--ease-out`, overshoot to 1.14 | you changed something, bigger than a button | fade only, existing rule |
| button-press | tap on any button | 160ms | `--ease-out` | tactile confirmation | collapses to 0.01ms globally — acceptable, it's a micro-interaction not an announcement |
| monster-thinking | attempt submitted | loops, bounded ≤3 cycles, holds last frame | `--ease-in-out` | your attempt is being read | static thinking pose, no loop |
| monster-incorrect (NEW) | judge returns fail | ~300ms in | `--ease-out`, no overshoot | that didn't work, and it's okay | static gentle pose, 200ms fade |
| monster-celebrate | judge returns pass | ~400–500ms burst | ease-out, slight overshoot | you did it | static badge, 200ms fade |
| panel-standard (NEW) | modal/larger panel opens | 300ms | `--ease-in-out` family | a new layer opened | fade only, 200ms |
| path-reveal (NEW) | map first load | 400–600ms, one-time | `--ease-out` | here's how far you've come | static, shown immediately |
| current-node-pulse (NEW) | map idle marker | ≤3 cycles then static | `--ease-in-out` | you are here | static ring, no pulse |
| reward-counter-tick (NEW) | number change on pass | synced 1:1 to increment | linear | the number is really going up | instant update, no count-up |

## 5) Russian copy-tone rules

- **ты** for all child-facing copy; **вы** reserved for parent screens/emails. *Source: umschool.net, algoritmika.org.*
- **≤8-word instructions**, one clause, no subordinates — kids read syllable-by-syllable to ~9–12. *Source: Uchi.ru Habr /516356; corroborated by NN/g.*
- **Concrete verbs tied to the visible element**, not abstract categories (Uchi.ru's "закрашена"→"зелёная" fix cut errors 66%). *Source: Uchi.ru Habr.*
- **Praise names the specific action**, never bare "Молодец." *Source: ru-market rec 5.*
- **No ranking/comparison language** ("обогнал N детей", cross-child "уровень N из M"). *Source: blog.rt.ru; screenwiseapp.com.*
- **Verdict never the first word** — no leading "ошибка"/"неправильно"; frame as the monster's suggestion, not a judgment. *Source: ru-market; Duolingo non-punitive design rationale.*
- **Exclamation marks sparing**, reserved for the genuine pass moment. *Source: Uchi.ru one-CTA/one-reward-moment discipline.*

## 6) Anti-patterns for minors

- **Streak with hard reset-to-zero** — documented child distress (panic, prioritizing app over sleep, performative learning). *screenwiseapp.com; growth.design (Gotthilf).*
- **Wagers/gem economies tied to commitment** (Duolingo's Investment Wager, +14% D7 for adults) — a soft financial stake inappropriate for an 8–11 audience with no money literacy. *growth.design.*
- **Leaderboards/competitive ranking** — flagged even for 12–14; sharper anti-pattern below that. *screenwiseapp.com; blog.rt.ru.*
- **Autoplay at any boundary** — removes the disengagement point a child needs. *coursera-udemy-codecademy.md Udemy verdict; evidence-kids-ux.md row 14.*
- **Confirmshaming/manipulative microcopy.** *growth.design (Duolingo's own teardown).*
- **Interruption stacking** (mid-task promos, splash screens). *growth.design.*
- **Loss-framed nudges** (streak-at-risk banners, urgency countdowns) — prohibited under ICO Standard 13. *evidence-kids-ux.md row 13 (fetch blocked 403, reconstructed — treat as Moderate-Strong).*
- **Early monetization/any payment UI reaching the child's screen** — Brilliant's paywall lands ~1 min into onboarding; for a COPPA product this is owner-only territory regardless of design merit (`AGENTS.md` §6). *design-duolingo-brilliant.md.*
- **Reward loops decoupled from mastery** (Prodigy Math: currency/pets overtake the math). *design-kids-stem.md, CSM, Fairplay for Kids.*

## 7) Open decisions for Fable

1. **Rive vs Lottie vs CSS for companion states.** *Recommend: stay CSS/SVG* (current `MonsterSVG` layered-glyph approach, commit `0c7b0a4`). Rive's edge (state-machine-driven, smaller than Lottie — Brilliant's own stated reason) only pays off once state count exceeds what CSS keyframes cleanly express; we're at ~4–5 states (idle/thinking/incorrect-new/celebrate). Revisit after a 6th+ state or cross-state blending is needed — don't adopt pre-emptively on Duolingo/Brilliant's authority alone, since neither app's implementation cost was independently verified (design-duolingo-brilliant.md's own UNVERIFIED section).
2. **Add voice-over?** *Recommend: not yet.* No report directly recommends it for this band (ScratchJr's "no voice-over" is explicitly inferred/UNVERIFIED). The better-evidenced, cheaper lever for the reading-load problem is the icon/worked-example-first redesign (principle 3, MIT Media Lab + DragonBox-backed). Reconsider only if reading load is still measured as a problem after that ships.
3. **Button radius: pill vs 12px?** *Recommend: keep ~16px "structured."* Matches Duolingo(12)/Khan Kids(12)/uchi.ru(16), MindShift's closest audience comparables; pills (54–100px, Brilliant/Coursera) read as adult-SaaS per live-tokens.md's own framing.
4. **Mechanic interleaving before visual polish?** *Recommend: yes, sequence it first.* Prodigy's cautionary case and the RU gamification-ethics source both warn that polish outpacing mechanic decorates something unsettled — and `TaskWorkspace.tsx`'s own comment shows the tier-withdrawal model was only fixed as of 2026-08-13. One more mechanic-interleaving pass before further Rive/celebration investment.
5. **How to reconcile design-kids-stem.md's rec #4 ("always-present tap-for-help") with `stuck.ts`'s existing escalation?** *Recommend: don't add a naive always-visible help button.* `stuck.ts`'s contract (`08-UX-MONSTER-JOURNEY` §10.1) explicitly forbids anything that asks whether the child is struggling or switches modes — that signals surveillance. Instead add a low-key, always-present "ask the monster" tap target usable *before* the server's 2-failure auto-trigger (there is currently no child-initiated path, only the server-triggered one), routed through the identical bubble UI and priced via the existing `hintCostFor()` at the pre-threshold cost. This gets Khan Academy Kids' "normalize asking" principle without duplicating or undercutting the shipped stuck-detection state machine.
