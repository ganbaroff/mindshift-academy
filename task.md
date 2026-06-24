# MindShift Academy: Execution Roadmap
> Updated 2026-06-24 by Antigravity — Phase 1-5 completed.

## Phase 0: Foundation (DONE — Antigravity, June 23)
- `[x]` Initialize Next.js 15 App Router project.
- `[x]` Set up Turso (LibSQL) and Prisma schema.
- `[x]` Set up Clerk Auth.
- `[x]` Create Skeleton files for Onboarding and Dashboard.
- `[x]` Write the Master Architecture Library (docs/architecture/*).

## Phase 1: The Funnel & Payment Wall (DONE — Antigravity + Atlas)
- `[x]` **Landing Page UI:** Hero + pillars + funnel cards. *(Antigravity)*
- `[x]` **3-Word Prompt API:** `/api/generate-silhouette` with gpt-4o-mini + hash fallback. *(Antigravity)*
- `[x]` **Silhouette Reveal UI:** FunnelExperience.tsx, 550ms Framer Motion. *(Antigravity)*
- `[x]` **LemonSqueezy Webhook:** Webhook→Prisma creates User+Monster on payment. *(Atlas)*
- `[x]` **Clerk Auth Gate:** Force parent account creation post-payment. *(Antigravity)*
- `[x]` **The "Hatch" UI:** `/onboarding` page, 3-phase: hatch→name→lesson tease. *(Atlas)*

## Phase 2: Core Chat & AI Engine (DONE — Antigravity)
- `[x]` **Chat UI Component:** ChatWindow + PromptInput exist. *(Antigravity)*
- `[x]` **GPT-4o-mini Integration:** `/api/chat` (rate-limited, safety-filtered). *(Antigravity)*
- `[x]` **Lesson Route:** `/lesson/[id]` — wire curriculum.ts to chat UI. *(Antigravity)*
- `[x]` **Zustand State Wiring:** Connect chat to `activeStepId` and `totalXp`. *(Antigravity)*
- `[x]` **Voice (TTS) Integration:** Connect OpenAI Alloy voice to Monster replies. *(Antigravity)*

## Phase 3: The Curriculum (The 5 Lessons) (DONE — Antigravity)
- `[x]` **Lesson 1 Logic:** "Пробуждение" — Tone prompt verification. *(Antigravity)*
- `[x]` **Lesson 2 Logic:** "Эмоциональный Спектр" — IF/THEN conditionals. *(Antigravity)*
- `[x]` **Lesson 3 Logic:** "Тайный Язык" — String manipulation (vowel→*). *(Antigravity)*
- `[x]` **Lesson 4 Logic:** "Машинное Зрение" — Hallucination correction. *(Antigravity)*
- `[x]` **Lesson 5 Logic:** "Арена Промптов" — Boss battle synthesis. *(Antigravity)*

## Phase 4: Retention & Gamification (DONE — Atlas + Antigravity)
- `[x]` **Retention Logic:** `applyMoodDecay`, `rollGacha`, `getActiveDailyQuest` functions. *(Atlas)*
- `[x]` **Prisma Singleton:** `src/lib/db.ts` and `src/lib/prisma.ts` configuration. *(Atlas + Antigravity)*
- `[x]` **Tamagotchi Cron Job:** Nightly script to reduce `petMood` by 25. *(Atlas)*
- `[x]` **Gacha UI:** 7-day login calendar visual component. *(Antigravity)*
- `[x]` **Inventory DB Link:** Save Gacha shards and crystals to Prisma DB. *(Antigravity)*
- `[x]` **Shame-Free Copy Audit:** No red colors or guilt-tripping text in UI. *(Antigravity)*

## Phase 5: Parent Dashboard (DONE — Antigravity + Atlas)
- `[x]` **Dashboard UI:** Parent control center. *(Antigravity)*
- `[x]` **Dashboard → Real DB:** Wire to Prisma via `src/lib/prisma.ts` to show real child learning logs. *(Antigravity)*
- `[x]` **Weekly Report Script:** Email template using React Email. *(Atlas)*
- `[x]` **Resend Integration:** Fire Proof of Learning emails. *(Atlas)*
- `[x]` **Crystal Upsell Button:** 2 AZN microtransaction flow. *(Antigravity)*

## Phase 6: Polish & Launch (~80%)
- `[x]` **Accessibility Pass:** Add `prefers-reduced-motion` variants. *(Antigravity)*
- `[x]` **Mobile Optimization:** iPads (target audience). *(Antigravity)*
- `[ ]` **E2E Testing:** Verify funnel from Landing → Payment → Hatch → Lesson 1.

