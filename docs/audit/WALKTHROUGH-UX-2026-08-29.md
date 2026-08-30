# MindShift Academy — Walkthrough UX Audit (2026-08-29)

## Method

- Local dev server, driven via the repo's own demo-bypass recipe: `?demo=1` query param + `x-test-bypass` header, with `FAKE_AI=1` to avoid live model calls.
- 21 screenshots captured to `evidence/walkthrough-2026-08-29/`.
- Capture harness kept in the repo at `scripts/e2e/walkthrough-audit.mjs`.
- Screenshot analysis performed by an Opus designer agent the same day.
- CEO complaints this walkthrough was run to answer: repetition across sessions; no upfront explanation before a task starts; «перетаскивать невозможно» (drag doesn't work / feels impossible); awkward removal of items once added.

---ANALYSIS BEGIN---

# MindShift Academy — UX Design Analysis (Screenshots 2026-08-29)

Evidence: evidence/walkthrough-2026-08-29/ (21 PNGs + manifest.json). Note: five session `-initial` frames captured a loading spinner only; onboarding captured blank (defect to re-verify live).

## Per-screen verdicts
- Landing (01/02): clear parent value prop, numbered family-start steps, working demo widget. Best-in-class alongside /enter-code.
- Enter-code (03): one action, one button, audio read-aloud — best-designed screen in the set.
- Privacy (04): draft-flagged, parent-readable, fine.
- Dashboard (06): dense but organized; parent clarity strong ("Если я говорю FIRE, отвечай WATER" concept chips).
- Onboarding (07): rendered COMPLETELY BLANK — only gradient + report-problem chip. Re-check live before citing onboarding as done.
- w1-s1 grid-draw (08): goal text now above board (reorder confirmed live), BUT sentence inverted — success condition («получится, когда...») before the task verb. CRITICAL: target picture and input grid are TWO different components — target = colored cells, input = separate plain buttons labeled "1,1","1,2" below. Child must translate visual cell → coordinate button. This coordinate-lookup step is the literal source of the «перетаскивать невозможно» sensation: the picture affords direct touch, the hit targets are elsewhere. Mobile: sticky «Подсказка/Проверить» bar occludes rows 2-4 of the grid.
- w2-s3 sequence «собраться и выйти» (09): goal above board ok. FUNCTIONAL BUG captured: «Взять ключи» added TWICE (steps 1 and 2) — source chips stay fully active after use, no de-dup, no state change. «Убрать» is a pale text link that reads as disabled — the removal-awkwardness complaint verbatim. Added-list sits far below the picker → child can't see state while choosing. Same mobile occlusion.
- w3-s1 rule-runner (10): goal line is meta («Смотри цель и собирай поле ниже»), real goal a paragraph down; task says «на двух картах» but NO card is ever rendered — reasoning about an invisible referent. Third widget paradigm in three screens: native <select> dropdowns, small targets, inconsistent with tap-button language.
- w4-s1 pattern-expand (11): goal inverted again; radio + two bare number inputs («Начальное число», «Шаг») with example hidden in collapsed box; fourth widget type.
- w5-s1 claim-check (12): statements «про картинку» — but no картинка rendered. Fifth widget type (Верно/Неверно radios), least game-like.
- Repetition perception driver on every session: identical chrome (teal «Коротко», purple example accordion, peach callout, «Сказать своими словами»), static smiley monster, same beige palette — only the widget differs, and a skimming child doesn't register that.

## Top-10 fixes (impact/effort)
1. M/High — Pre-board intro screen per session: story hook in monster voice → forward-phrased goal → «Готово, когда...» bullet → CTA «Начать». Reuses existing goalRu/explanationRu; sequencing only.
2. S/High — Show peach explanation callout on mount, not after first collision.
3. M/High — Unify target-visual and input-visual: w1 tap directly on the SAME grid as the target picture (overlay), killing coordinate lookup; w2 added chips grey out + checkmark in place.
4. S/High — Disable used chips + high-contrast icon-based remove control replacing pale «Убрать»; prevents captured duplicate-add bug.
5. S/High — Mobile sticky-bar occlusion: bottom padding equal to bar height or icon-collapse until near-bottom scroll.
6. M/High — Render the referenced visual in w3 and w5 (grid/card component exists from w1 — prop wiring, not new content).
7. M/Med — Per-world visual theming (background hue, accent, one motif per week) — CSS/asset layer only, anti-repetition without curriculum rewrite.
8. S/Med — Monster reacts: 3-4 emotion states (idle/correct/wrong/celebrate) tied to task state; cheapest anti-sameness lever.
9. S/Med — Verify spinner/blank states live (5 of 7 initial frames = spinner; onboarding blank); a multi-second blank before goal text defeats fix #1.
10. S/Low-Med — «Ты решил уже 3 таких» mini-mastery meter, distinct from XP bar.

## Verdict on «перетаскивать невозможно» / «удаление неудобно»
No drag code exists; the complaint is correct as description of visual grammar. Causes: (a) w1 target/input split across two different-looking components; (b) w2 chips never change state after use + inert-looking remove link. Minimal fix = #3 + #4: component-level state/CSS, no drag library, no curriculum rewrite.
---ANALYSIS END---

## Status of related working-tree fixes

The following fixes touching this analysis are already applied in the working tree, are `tsc`-clean, and are **not committed**:

- Goal-above-board reorder: applied in `src/components/curriculum/task-surfaces/TaskWorkspace.tsx` (uncommitted).
- Age range 8-11 correction: applied in `src/lib/moderation.ts` (uncommitted).
- Removed the `certificateReady||true` fail-open bypass (uncommitted).

All three are `tsc`-clean as of this pass; none have been committed.

## Fix round 2026-08-29 (evening)

Re-ran `scripts/e2e/walkthrough-audit.mjs` (25 screenshots → `evidence/walkthrough-2026-08-29-after/`) and read the results directly, plus a targeted `npx tsc --noEmit` for a follow-on density fix. All four fixes below are in the working tree, uncommitted.

- **FIX B (unify target-visual and input-visual, top-10 #3) — verified in pixels.** `08-w1-s1-interacted.png`: the target picture and the interactive field are now the same visual grammar — both rounded-square grids, target cells shown filled/green above, the live input grid below with 3 tapped cells rendered in the same cyan fill. The coordinate-lookup mismatch from the original audit ("target = colored cells, input = separate plain buttons labelled 1,1 / 1,2") is gone; a child taps directly on a grid that looks like the goal grid.
- **FIX C (disable used chips + high-contrast remove control, top-10 #4) — verified.** `09-w2-s3-interacted.png`: source chips that have been used now render as `✓ добавлено · Взять рюкзак` / `✓ добавлено · Выйти` (visibly disabled, greyed), so the captured duplicate-add bug ("Взять ключи" added twice) is structurally prevented. The added-steps list shows a red `✕ Убрать` icon+text button per step, replacing the pale, disabled-looking text link.
- **FIX A (explanation callout on mount, top-10 #2) — verified, plus a new density fix.** The callout renders on mount as designed. But surfacing it on every task stacked 8 distinct text blocks above the interactive board (this evening's own text-density finding) — the same callout on task 4 competed with the goal line, the "Готово, когда" line, the short summary chip row, and the workspace's own intro panel. Fix applied in `src/app/session/[id]/page.tsx`: the callout is now a collapsible disclosure — expanded by default only on task index 0 (`expanded = safeIndex === 0`, re-derived on every task-index change via a `useEffect`), collapsed elsewhere to a one-line `💡 Объяснение — нажми, чтобы открыть` button (`min-h-11`, `aria-expanded`), user-togglable in either direction. The post-collision force-expand in `runAttempt` is untouched and still fires because it never touches the task index. `npx tsc --noEmit` → `No errors found`.
- **FIX D (mobile sticky-bar occlusion, top-10 #5) — verdict: RESOLVED, no occlusion found.** Added 4 real 375px viewport-only screenshots (`fullPage:false`, not the fullPage captures used elsewhere) to the harness: `08-w1-s1-mobile-viewport.png`, `08-w1-s1-mobile-viewport-bottom.png`, `09-w2-s3-mobile-viewport.png`, `09-w2-s3-mobile-viewport-bottom.png`. Read all four directly:
  - `08-w1-s1-mobile-viewport.png` (board scrolled into view): the grid's last row is fully visible with clear padding beneath it before the sticky `Проверить` bar starts — no overlap.
  - `08-w1-s1-mobile-viewport-bottom.png` (scrolled to page bottom): the last content block ("Сказать своими словами" disclosure) sits fully visible above the sticky bar with a clear gap — no overlap.
  - `09-w2-s3-mobile-viewport.png` (list scrolled into view): the last action row ("+ Открыть дверь") and the "Пока нет шагов." / "Начать порядок заново" text below it are fully visible above the sticky bar with a gap — no overlap.
  - `09-w2-s3-mobile-viewport-bottom.png` (scrolled to page bottom): same "Сказать своими словами" disclosure fully clear of the sticky bar.
  At 375px, in both mobile session captures, the sticky `Проверить` bar does not cover any board/list row in either the scrolled-into-view or scrolled-to-bottom state — the padding added under FIX D holds under direct visual re-verification.
