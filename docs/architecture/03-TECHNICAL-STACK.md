# MindShift: Technical Stack Architecture

## 1. Core Frameworks
- **Frontend/Backend:** Next.js 15 (App Router). Strict separation of Server Components (data fetching) and Client Components (interactivity).
- **Styling:** Tailwind CSS + Framer Motion (for Bouncy, dopamine-heavy but safe animations).
- **State Management:** Zustand (File: `src/stores/game.ts`). Centralized state for Total XP, Crystals, Inventory, and Active Lesson.

## 2. Database (Turso / LibSQL + Prisma)
- **Adapter:** `@prisma/adapter-libsql` is used instead of standard Prisma drivers for edge compatibility.
- **Key Models:**
  - `User`: Handles auth relation, `totalXp`, `crystals`, `streak`, `petMood`.
  - `LessonProgress`: Tracks completed lessons.
  - `Inventory`: Handles Gacha shards and cosmetics.

## 3. Security & Validation
- **Auth:** Clerk.
- **Ingress Validation:** Zod schemas for all API payloads.
- **Rate Limiting:** Upstash Redis (10 requests / 10 seconds per IP).
- **Error Masking:** Raw database/API errors are NEVER sent to the client. Caught by standard wrapper returning generic `{ error: "Internal Error" }`.

## 4. AI Services
- **Chat/Logic Checking:** `gpt-4o-mini`. Cheap, fast. Used for verifying if a child's prompt contains the required logic.
- **Image Generation:** `gpt-image-2` (DALL-E 3 retired). Images are converted to base64 Data URLs and stored locally to save costs.
- **TTS:** OpenAI TTS (Alloy voice) for the Monster's dialogue.
