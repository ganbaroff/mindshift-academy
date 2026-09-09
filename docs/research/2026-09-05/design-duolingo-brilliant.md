# Design Benchmark: Duolingo & Brilliant as Learning-Experience References for MindShift Academy

Research date: 2026-09-05. Scope: sourced, concrete design patterns only — no invented specifics. Items without a public source are listed under UNVERIFIED rather than asserted.

## Duolingo patterns

1. **State-machine character reactions.** Each mascot (Duo, Lily, Eddy, etc.) runs a Rive state machine with named states/triggers — idle → correct/incorrect → idle_reset — driven by boolean/trigger inputs so the character reacts live to each answer rather than playing a canned clip. Source: [Building character](https://blog.duolingo.com/building-character/); [How exactly is Duolingo using Rive?](https://elisawicki.blog/p/how-exactly-is-duolingo-using-rive) (via search synthesis — direct fetch redirected, not independently re-verified).
2. **Mid-lesson interstitial rewards.** Beyond per-answer reactions, "mid-lesson animations" are interstitials that reward a learner after several correct answers in a row — a distinct celebration tier above the per-question reaction. Source: [Building character](https://blog.duolingo.com/building-character/).
3. **Non-punitive incorrect-state design.** Wrong answers trigger gentle character animation and encouraging copy rather than a red error screen or harsh sound; the explicit design rationale cited is that learners need to feel safe making mistakes. Source: search synthesis of [uianimation Medium: Duolingo-Style Animation in Mobile Apps](https://uianimation.medium.com/duolingo-style-animation-in-mobile-apps-2026-how-it-works-and-what-a-rive-animator-brings-to-53f21ab79cbc).
4. **Two-track typography system.** Feather Bold (a bespoke, owl-wing-inspired display face by Fontsmith/Krista Radoeva, 2019 identity refresh) is used for headlines/brand moments; DIN Next Rounded handles functional interface copy — brand personality vs. everyday readability kept deliberately separate. Source: [Monotype: Duolingo custom font](https://www.monotype.com/resources/duolingo-custom-font-inspired-their-owl-mascot-duo).
5. **Streak counter as a Zeigarnik-effect progress mechanic.** The streak (and progress bars generally) exploit the tendency to remember unfinished tasks more than finished ones; former Head of Growth Gina Gotthilf is quoted that streaks bring people back but losing one is also a top reason people quit. Source: [growth.design — Duolingo's User Retention: 8 Tactics](https://growth.design/case-studies/duolingo-user-retention).
6. **"Happy path" re-engagement.** Lapsed users get a deliberately easier review lesson to rebuild confidence before difficulty ramps back up. Source: growth.design (above).
7. **Investment Wager — measured lift.** A specific onboarding step asking users to wager gems on a 7-day commitment produced a documented **+14% Day-7 retention** lift. Source: growth.design (above).
8. **Notification self-limiting.** Duolingo stops sending re-engagement notifications once a user has been inactive long enough, rather than escalating — the case study calls this an unusually respectful practice, rare among retention-driven apps. Source: growth.design (above).
9. **Self-critique of interruption stacking.** The case study criticizes Duolingo's own mid-session interruptions (quiz prompts, podcast suggestions, splash screens) as wasting "precious user psych in a very fragile moment." Source: growth.design (above).
10. **Manipulative microcopy flagged as bad practice.** growth.design names "manipulinks" and "confirmshaming" as patterns Duolingo should avoid, stating "making users feel bad about themselves…is rarely a good idea." Source: growth.design (above).
11. **Claimed business impact of the character/animation system.** DAU reportedly grew from 14.2M to 34M+ within about two years of shipping animated-character feedback, subscribers roughly doubling — cited as evidence the feedback layer, not just content, drove retention. Source: secondary [uianimation Medium](https://uianimation.medium.com/duolingo-style-animation-in-mobile-apps-2026-how-it-works-and-what-a-rive-animator-brings-to-53f21ab79cbc); see UNVERIFIED.

## Brilliant patterns

1. **"Game Feel" North Star.** Brilliant commissioned design studio ustwo specifically to define a "Game Feel" vision balancing fun against the concentration STEM content demands — game mechanics must not distract from problem-solving focus. Source: [ustwo — Brilliant.org case study](https://ustwo.com/work/brilliant/).
2. **Competency-based onboarding.** Onboarding opens with an actual diagnostic math problem (not a survey) to calibrate difficulty, making personalization feel earned rather than arbitrary. Source: [screensdesign.com — Brilliant showcase](https://screensdesign.com/showcase/brilliant-learn-by-doing).
3. **One problem per screen, active participation required.** Lessons are "bite-sized" with a single core exercise per screen requiring interaction, not passive reading. Source: screensdesign.com (above).
4. **Interactive wrong-answer explanations.** When a user errs, the explanation itself is interactive — the learner can manipulate/explore the concept rather than just read the correct answer. Source: screensdesign.com (above); confirmed independently by ustwo.com.
5. **Branded loading state.** Tangram-style loading animations replace generic spinners, reinforcing the problem-solving brand identity even in dead time. Source: screensdesign.com (above).
6. **Visualized branching path ("Level Gameboard").** Course structure is shown as a clear branching path with a persistent "Level Gameboard" tracker so the learner always sees where they are and what's next, while retaining choice of route. Source: ustwo.com (above); screensdesign.com (above).
7. **Streak/counter animation numerically synced to state.** Engineering specifically chose Rive over Lottie so the streak-increment animation is driven by the same event trigger as the actual counter, keeping the animation "seamlessly aligned with the increasing number" instead of a decorative overlay. Source: [Rive blog — How Brilliant.org motivates learners](https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations).
8. **Rive chosen over Lottie for cost/interactivity reasons.** Brilliant's engineers evaluated Lottie (already in use) against Rive and switched because Lottie couldn't do custom state-to-state transitions without extra engineering, and Rive files are a fraction of the size of Lottie JSON/video/GIF assets — a concrete file-size and interactivity trade-off. Source: Rive blog (above).
9. **Distinct encouragement state for struggling learners.** Separate from a plain "incorrect" reaction, the design includes an explicit encouragement moment for users who are visibly struggling, not just failing once. Source: ustwo.com (above).
10. **XP + celebratory animation on completion, but leagues unlocked later.** Lesson/practice completion triggers XP counters and celebration animation immediately; competitive leagues are introduced as a later-unlocked layer rather than shown from minute one. Source: screensdesign.com (above).
11. **Early, heavy-handed paywall.** The teardown timestamps a paywall appearing at roughly one minute into onboarding (before meaningful product use), with a trial timeline, testimonials, and a feature-comparison table to build trust before asking for payment. Source: screensdesign.com (above) — flagged here as a data point, treated as anti-pattern below.
12. **Dual-audience onboarding question.** Onboarding asks whether the user is a student, curious learner, or professional — one funnel serving K-12 and professional audiences. Source: secondary [Medium/Bootcamp](https://medium.com/design-bootcamp/a-case-for-programming-bewitched-by-brilliant-gamification-a-kinda-product-review-of-brilliant-a941d2cfc7d0), not independently re-verified.

## Steal list (pattern → MindShift screen → concrete change)

1. **State-machine reactions (D1)** → Task screen / feedback fail+pass → Give the companion monster explicit named states (idle / thinking / correct / incorrect / celebrate) wired to real trigger events from the judge result, matching the pattern already begun in commit `e3ffd46` ("monster reacts — thinking on attempts, celebration on pass"); extend it with a distinct, gentler *incorrect* state rather than reusing "thinking."
2. **Non-punitive incorrect design (D3)** → feedback-fail screen → Audit fail-state copy/color for anything red/alarm-toned; replace with warm, specific, encouraging language and a soft monster reaction, consistent with the fail-closed *safety* posture already in `src/lib/consent.ts` but distinct from *pedagogical* failure tone.
3. **Interactive re-explorable wrong-answer explanation (B4)** → feedback-fail screen → Instead of a static "here's the correct prompt" text block, let the child re-attempt the same rule-runner/pattern-expand/grid-draw step live with one hint surfaced, rather than reading a solution.
4. **One exercise per screen, minimal instruction length (B3)** → task screen → Confirm each of the 5 task families (grid-draw, sequence-world, rule-runner, pattern-expand, claim-check) shows exactly one task with short instruction copy above the fold; trim any task where instructions run past 2 short lines.
5. **Visible partial-completion progress, no punitive reset (D5, but stripped of loss aversion)** → session-intro / task screen → Add a simple "task 2 of 5" or dot-progress indicator per session; do not attach any streak-reset penalty to it.
6. **Branching visual path / "Level Gameboard" (B6)** → map screen → Render the 5-week × 3-session structure as a visible path with clear completed/current/upcoming states, not a flat grid, so the map communicates progression the way Brilliant's course path does.
7. **Branded loading state (B5)** → any transition (task load, session-complete) → Replace default spinners with a short monster-themed loading beat tied to the AI-prompting brand instead of a generic spinner.
8. **Counter/celebration sync (B7)** → session-complete screen → If any point/counter UI is added, drive its animation off the same event as the number change, not a decorative parallel animation.
9. **Notification self-limiting, not escalation (D8)** → any future parent/guardian nudge system → If reminder notifications are ever built, cap and taper them on inactivity; do not escalate frequency or tone, and never frame them around loss.
10. **Interruption discipline (D9)** → task screen → Do not stack unrelated promos/interstitials mid-task; this is the one place growth.design's teardown criticizes Duolingo's own execution, and is cheap to avoid by policy.

## Anti-patterns to avoid for the 8–11 cohort

- **Daily streak with hard reset-to-zero.** Documented as inducing genuine child distress: cited behaviors include panic/tears when a streak is threatened, prioritizing the app over sleep or family time, and "performative learning" where kids repeat trivially easy content just to preserve the number rather than to learn. Sources: [screenwiseapp.com — Duolingo Streaks and the 'Loss Aversion' Trap: A Parent's Guide](https://screenwiseapp.com/guides/duolingo-streaks-and-anxiety-in-kids); growth.design (Gotthilf quote, above). MindShift should track progress without a break-resets-to-zero mechanic.
- **Confirmshaming / manipulative microcopy.** growth.design's own teardown names this as a pattern to avoid — guilt-tinged copy that shames a user for not continuing. Source: growth.design (above).
- **Gem/wager economies tied to commitment pressure.** The "Investment Wager" (bet gems on a 7-day streak) is effective for adults but structurally a soft financial-feeling stake for an 8–11 audience with no real money literacy yet. Source: growth.design (above).
- **Competitive leaderboards / leagues for this age band.** Cited specifically as a source of unhealthy social comparison in the 12–14 range, which is already older than MindShift's 8–11 V1 cohort per `docs/canon/MINDSHIFT-PRODUCT-CANON-V1.md` §1 — leagues are a clearer anti-pattern for the younger group, not a lighter version to include. Source: screenwiseapp.com (above).
- **Difficulty manipulation to inflate engagement metrics.** growth.design describes deliberately "manipulating user flows a bit" via an artificially easier lesson to pull lapsed users back — defensible for a language habit app, not for a tool whose judge is meant to be deterministic and honest per AGENTS.md §1. Source: growth.design (above).
- **Mid-session interruption stacking** (quiz prompts, cross-promotion, splash screens). Source: growth.design (above), self-critique.
- **Early monetization gating before value delivery.** Brilliant's paywall lands roughly a minute into onboarding; for a COPPA-covered children's product this timing (and any payment ask reaching a child's screen at all) is a clear line MindShift should not cross — payment/consent flows belong with the parent, not mid-onboarding for the child. Source: screensdesign.com (above); cross-reference `AGENTS.md` §6 (COPPA sign-off is owner-only).
- **Aggressive/guilt-based push notifications** — widely reported by title only ("Duolingo's Habit-Forming Reminders," "…Guilt, Memes, & Farts"), not independently fetched; escalation mechanics are UNVERIFIED since the one teardown fetched in full documents the opposite (self-limiting) behavior — likely different eras of the system.

## Sources

- https://blog.duolingo.com/building-character/
- https://growth.design/case-studies/duolingo-user-retention
- https://rive.app/blog/how-brilliant-org-motivates-learners-with-rive-animations
- https://ustwo.com/work/brilliant/
- https://screensdesign.com/showcase/brilliant-learn-by-doing
- https://screenwiseapp.com/guides/duolingo-streaks-and-anxiety-in-kids
- https://60fpsdesign.substack.com/p/fun-in-every-frame
- https://www.monotype.com/resources/duolingo-custom-font-inspired-their-owl-mascot-duo
- https://uianimation.medium.com/duolingo-style-animation-in-mobile-apps-2026-how-it-works-and-what-a-rive-animator-brings-to-53f21ab79cbc (secondary, search-synthesis only)
- https://elisawicki.blog/p/how-exactly-is-duolingo-using-rive (search-synthesis only; direct fetch redirected to substack.com root and was not re-fetched)
- https://medium.com/design-bootcamp/a-case-for-programming-bewitched-by-brilliant-gamification-a-kinda-product-review-of-brilliant-a941d2cfc7d0 (secondary)

## UNVERIFIED

- Exact animation durations/easing curves for either platform — not published anywhere found; likely proprietary.
- Typography/spacing pixel tokens (line-height, grid, spacing scale) for either app — not disclosed publicly.
- Screen-reader/accessibility implementation for either app's lesson screens — no source found; Rive supports state-machine/reduced-motion in principle, but neither app's actual use was confirmed.
- DAU 14.2M→34M+ growth tied to the animated-character launch (D11) — one secondary Medium article, not a primary Duolingo statement; directionally suggestive only, not confirmed causal attribution.
- Current (2026) Duolingo notification cadence — conflicting signals between growth.design's "self-limiting" claim and the wider reminder-nagging reputation; unresolved by sources fetched here.
- Brilliant's onboarding step count and paywall timing (screensdesign.com timestamps, e.g. "01:04") — one specific teardown capture, not confirmed as current production behavior as of September 2026.
