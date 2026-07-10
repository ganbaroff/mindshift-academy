# CEO decisions — MindShift Academy (one-tap gate queue)

> Written 2026-07-10 by Atlas. Everything in Atlas's lane is done + committed (`5b609b8`) + deployed
> (https://mindshift-academy-three.vercel.app). The product works end-to-end **when the model is up**
> (verified live). Only these TWO decisions are yours — each needs YOU, not more code.

---

## DECISION 1 — Make the chat reliable (NVIDIA off the free tier)
**Problem:** the whole chat (safety filter + judge + tutor) runs on ONE free-tier model
`meta/llama-3.1-8b-instruct`. It **flaps** — up now, fully down (30s timeouts) an hour ago. When it
times out, the safety filter fail-closes (correct for kids) and **every message is blocked**. The weak
8b also occasionally false-flags a clean answer (lesson 3 cipher). I cannot fix this in code without
weakening the child-safety filter — which I will never do.
**Your one-tap:** pick a reliable provider (credits-first: **NVIDIA Inception dedicated → Vertex →
Azure**), give me the endpoint + key in the secret store (Vercel env), and I wire it same session.
**Unblocks:** the chat stops flapping; lessons 2/3/5 stop intermittently blocking; a real test becomes trustworthy.

## DECISION 2 — Legal green-light for a real test family (COPPA)
Right now the site is safe because ALLOWLIST = your 2 emails only — **no real child is exposed.** The
moment a real family email is added, a consent gate MUST exist first.
- **2a — Approve the closed-test consent method.** The spec (`docs/COPPA-CONSENT-SPEC.md`) proposes
  **email-plus + a separate explicit opt-in to NVIDIA processing.** It's the defensible engineering
  minimum, **not** a lawyer sign-off. COPPA method choice is CEO-only. **Say "build email-plus" and I
  ship the whole gate this session** (ParentalConsent model, `/consent` page, Resend code email RU+AZ
  already written, 403-until-consent on chat/lesson/monster/tts fail-closed, revoke button).
- **2b — Yours regardless (legal, not code):** sign the **NVIDIA DPA** (binds them as processor of
  child data); for PUBLIC launch add a stronger VPC method + a children's privacy-policy page + a
  **human lawyer sign-off**.
**Unblocks:** 2a → you can invite ONE real test family. 2b → public launch.

---

## Already done (Atlas lane — no CEO needed)
Server-authoritative state (no more relock/replay bugs) · tutor plays the VIEWED lesson · lesson themes
reframed so correct answers pass the safety filter (roar→sing, battle→maze) · atomic anti-double-award
(dev.db test 12/12) · a11y/design pass · offline regression suite (`scripts/regression.mjs`) ·
double-award + state proven by tests, not by clicking. Safety moderation untouched.

## What I do NOT need from you
Nothing else. Everything reversible and in-lane is shipped. These two decisions are the only gate.
