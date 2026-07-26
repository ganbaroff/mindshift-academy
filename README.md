# MindShift Academy

A COPPA-gated, invite-only web app that teaches children (8–14) the basics of prompt
engineering through a 5-lesson story: they hatch a digital monster, teach it to speak, invent a
secret cipher, fix its "vision", and solve a maze with IF/THEN logic — all by writing prompts to
a safe, moderated AI companion. Parents get a weekly progress report.

**Status:** share-ready for a **closed test**. Real-child production is gated on 3 human items —
see [docs/HANDOVER-2026-07-18.md](docs/HANDOVER-2026-07-18.md).

---

## Stack

- **Next.js 16.2.9** (App Router, React 19) + TypeScript
- **Clerk** — auth (invite/allowlist)
- **Prisma 7** on **Turso** (libSQL/SQLite) — 8 models
- **Upstash Redis** — distributed rate limiting (hard prod dependency)
- **AI:** Gemini 2.5-flash (tutor / judge / kid-net moderation) + NVIDIA Llama-Guard-4 (safety
  classifier). OpenAI optional (image / TTS).
- **Resend** — parental-consent email
- **Tailwind v4**, Framer Motion, Zustand

## Quickstart

```bash
npm install
cp .env.example .env          # then fill in real values (see .env.example for every key)
npm run dev                   # http://localhost:3000
```

All required environment variables are documented in [`.env.example`](.env.example). At minimum
you need Clerk keys, a Turso DB, Azure OpenAI (`AZURE_OPENAI_KEY`, endpoint, deployment and API
version) for the GPT tutor, plus `GEMINI_API_KEY` + `NVIDIA_API_KEY` for independent safety, and
at least one parent access grant. The legacy `ALLOWLIST_EMAILS` list is supported; preferred
operation is one additive `ACADEMY_ALLOW_EMAIL_<SHA256(email)>=1` variable per parent (see
[the parent-access runbook](docs/PARENT-ACCESS-RUNBOOK.md)). Upstash is required in production
(see deploy checklist).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (localhost:3000) |
| `npm run build` | Production build (`prisma generate` + `next build`, typechecks) |
| `npm run lint` | ESLint (Next core-web-vitals + typescript) |
| `npm test` | **Deterministic** test gate — pure, no server/provider/DB, cannot hang. CI gate. |
| `npm run test:live` | Live safety lane — real classifiers, self-starts server, hard deadline |
| `npm run test:consent` | Real local DB integration test for consent, revoke and code verification |
| `npm run test:e2e` | Full 5-lesson browser E2E (Playwright, real Chromium) |
| `npm run test:e2e:matrix` | Full 5-lesson E2E in Chromium, Firefox and WebKit |
| `npm run test:e2e-wrong` | Verifies a safe but wrong answer never receives a reward |
| `npm run test:regression` | Per-lesson judge/tutor + state-seam regression |
| `npm run test:falsepos` | Measures the moderation false-reject rate on a benign dataset |
| `npm run test:config` | Deterministic test for the production environment contract |
| `npm run test:ui` | Static accessibility contract for interactive Academy UI |
| `npm run check:prod-env` | Deployment preflight: validates only configuration names, never logs secret values |
| `npm run verify:release` | Full release gate: audit, lint, contracts, integration, safety, E2E matrix and build |

## Project structure

```
src/
  app/                    # App Router
    api/                  # route handlers (chat, monster, tts, consent/*, generate-silhouette, …)
    lesson/[id]/          # the 5 lessons (client) + server consent gate (layout.tsx)
    onboarding/           # hatch + name the monster (server consent gate)
    consent/              # parental consent screen (email-plus, 2 opt-ins)
    dashboard/            # parent weekly report + revoke consent
  lib/                    # consent, moderation, ai-provider, ratelimit, rewards, progression, silhouette, …
  components/             # chat, lesson, gamification, dashboard, companion …
  proxy.ts                # Next 16 Clerk auth boundary (protected-route → sign-in)
prisma/schema.prisma      # 8 models (User, Monster, Lesson, LessonProgress, ParentalConsent, …)
tests/                    # deterministic.mjs (gate) + safety.test.mjs (live lane)
scripts/                  # regression, e2e/, measure-falsepos, probes
docs/                     # HANDOVER, DEPLOY-CHECKLIST, COPPA-CONSENT-SPEC, architecture/, audits
```

## Safety & COPPA (the core invariant)

No child free-text reaches any external service — neither the generative model **nor** the
safety classifiers — before verified parental consent.

- **Consent gate** is fail-closed and enforced server-side on every child-data path
  (`/api/chat`, `/api/monster`, `/api/tts`) and on the lesson/onboarding page layouts.
  See [`src/lib/consent.ts`](src/lib/consent.ts) + [docs/COPPA-CONSENT-SPEC.md](docs/COPPA-CONSENT-SPEC.md).
- **Landing preview** (`/api/generate-silhouette`) is fully deterministic — zero egress, ever.
- **Moderation** runs two independent classifiers in parallel (Llama-Guard + kid-net) on child
  input AND AI output, and **fails closed** (blocks) on any classifier error.
  See [`src/lib/moderation.ts`](src/lib/moderation.ts).

## Testing

`npm test` is the reliable CI gate (deterministic, fast, no external deps — includes a static
guard proving the silhouette route has no AI egress). Run `npm run verify:release` before every
release: it composes the provider-dependent and browser lanes with audit, contracts and build.

## Deployment

Do **not** deploy without reading [docs/DEPLOY-CHECKLIST.md](docs/DEPLOY-CHECKLIST.md) — Upstash
Redis is a hard dependency (the whole product 503s without it), and there are prod-only items
(distributed-limit proof, prod Clerk keys, secret rotation).

## Documentation

- [docs/HANDOVER-2026-07-18.md](docs/HANDOVER-2026-07-18.md) — **start here** — delivery status, acceptance, open items
- [docs/RELEASE-FIXES-2026-07-18.md](docs/RELEASE-FIXES-2026-07-18.md) — every audit finding → fix, with evidence
- [docs/DEPLOY-CHECKLIST.md](docs/DEPLOY-CHECKLIST.md) — production runbook
- [docs/COPPA-CONSENT-SPEC.md](docs/COPPA-CONSENT-SPEC.md) — the consent design
- [docs/architecture/](docs/architecture/) — business, product, stack, curriculum, economy, parental gate, devops
