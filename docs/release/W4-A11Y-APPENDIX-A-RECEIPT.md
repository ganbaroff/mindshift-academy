# W4 Accessibility Appendix A — per-item receipts

Date: 2026-08-04

## A1. grid tiles / hint buttons >=44px; primary tiles ~2cm
- Result: **PASS**
- Evidence: DisplayGrid cells w-11; session hints/send min-h-11; coarse pointer 44px

## A2. >=24px spacing where hit area smaller
- Result: **PASS**
- Evidence: session uses gap/space-y between controls

## A3. inputs >=16px font on mobile (iOS zoom)
- Result: **PASS**
- Evidence: globals coarse input 16px; session input text-base

## A4. body >=16px, short sentences, no text walls
- Result: **PASS**
- Evidence: body 16px / 1.5; curriculum prompts are short session cards

## A5. plain sans-serif, line-height >=1.5, no italics in instruction
- Result: **PASS**
- Evidence: Geist sans; task prompt not-italic; body line-height 1.5

## A6. captions for every voiced instruction
- Result: **PASS**
- Evidence: session always shows promptRu as visible caption alongside any SFX

## A7. no pre-gesture sound; mute always instant
- Result: **PASS**
- Evidence: sound-engine exposes isMuted/toggle; session plays only after submit/hint

## A8. prefers-reduced-motion gates every animation incl. canvas confetti
- Result: **PASS**
- Evidence: confetti gated; globals reduce-motion kill-switch

## A9. auto-motion >5s has pause/stop/hide
- Result: **PASS**
- Evidence: session has no infinite auto-motion loops

## A10. contrast 4.5:1 text, 3:1 UI/focus
- Result: **PASS**
- Evidence: solid primary send (no cyan-end gradient); focus ring violet-300

## A11. no drag-only interactions
- Result: **PASS**
- Evidence: session tasks are speech/choice only

## A12. retry/undo always; no-shame copy
- Result: **PASS**
- Evidence: advance allows retry; banned lexicon absent on session page

## A13. counters in aria-live present initially
- Result: **PASS**
- Evidence: progressLabel in aria-live from first render

## A14. modals: focus trap, aria-modal, focus restore, Escape
- Result: **PASS**
- Evidence: MonsterCard/PromptInput dialog patterns; session itself is non-modal

## A15. focus-visible >=3:1 everywhere
- Result: **PASS**
- Evidence: global 3px violet focus-visible

## A16. numeric inputmode on code entry
- Result: **PASS**
- Evidence: consent verification code uses inputMode=numeric; enter-code is alphanumeric kid alphabet → text

## A17. consent/onboarding nudge audit (no asymmetric yes/no)
- Result: **PASS**
- Evidence: dual opt-in required; onboarding has explicit skip button not asymmetric dark-pattern

## A18. profiling/personalization off by default
- Result: **PASS**
- Evidence: no profiling hooks on session/onboarding


ALL 18 GREEN