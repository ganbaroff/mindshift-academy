# Async parent-approval child access — technical design

**Date:** 2026-07-19
**Status:** Draft — awaiting CEO review (brainstorming-skill gate, no implementation yet)
**Related:** [docs/COPPA-CONSENT-SPEC.md](../../COPPA-CONSENT-SPEC.md) — unchanged. That file governs consent
*content*/legality. This spec only changes *when and how* a Clerk session + consent request get created,
so a child can start alone.

## 1. Problem (grounded in current code, read 2026-07-19)

`src/app/page.tsx` header has exactly two entry points today: **"Личный кабинет родителя"**
(`/dashboard?demo=1`) and **"Войти"** (`/sign-in`) — both parent-framed. Hero copy is 100%
parent-addressed ("Ваш ребёнок научится..."). Nothing tells a first-time visitor, especially a
child, what to do.

`src/app/onboarding/layout.tsx` + `src/lib/access.ts` require a signed-in, allowlisted Clerk
session before a child can even name their pet. Nothing before that point ever prompts sign-in.
A child who opens a shared link today silently hits a wall unless a parent manually signs
up/in **on that same device** first — exactly the CEO's complaint: *"родитель не должен стоять
с ребёнком чтобы он это сделал."*

## 2. Confirmed decisions (CEO, this session, via AskUserQuestion)

1. **Device model** — child gets their own link/session; parent is never required at the
   child's device.
2. **Initiator** — the child can start alone, no parent sign-in first.
3. **Allowlist** — stays closed-list only (`ALLOWLIST_EMAILS`); no open self-serve registration
   (closed-test legal posture unchanged).
4. **Session mechanism** — Clerk sign-in ticket: server mints it, client silently consumes it.
   No password, no form, on the child's tab.

## 3. End-to-end flow

| # | Actor | Screen | Action | System effect |
|---|---|---|---|---|
| 1 | Child | `/` | Opens shared link, does the silhouette (3 words) — unchanged, already public/deterministic | none (no account yet) |
| 2 | Child | `/onboarding` (hatch+name) — reached without auth | Names pet, taps continue | none yet — no `/api/monster` call until parent email is known |
| 3 | Child | new screen, in pet's voice | Types parent's email | `POST /api/access-request` |
| 4 | System | — | Always, regardless of allowlist result | Identical `{ok:true}` response either way — child always lands on the waiting screen (§8: no allowlist-membership oracle). **If** allowlisted: creates/finds Clerk user by parent email, creates `AccessRequest` row, sets child-side httpOnly cookie, emails parent an approval link. **If not**: zero side effects — no row, no email, no cookie |
| 5 | Child | waiting screen | Free-plays (name pet, no save) while polling | `GET /api/access-request/status` every few seconds using the httpOnly cookie (or none, for the not-allowlisted case — see §6/§8 for why both read as plain "pending" and share one client-side timeout) |
| 6 | Parent | opens email on own device | Clicks approval link | `GET /consent?token=...` (existing `/consent` UI, extended to accept an approval token) |
| 7 | Parent | `/consent` (existing form, unchanged UI) | Email/code/two checkboxes, submits | `POST /api/consent/verify` (existing) **+** marks `AccessRequest` approved **+** mints Clerk sign-in ticket |
| 8 | Child | waiting screen (still open) | next poll returns `approved: true` + ticket | client calls Clerk `signIn.create({strategy:"ticket", ticket})` → real session → redirect `/onboarding` → `/lesson/1` |

Parent never opens the app on the child's device. Child never sees a Clerk form.

## 4. New data model

```prisma
model AccessRequest {
  id            String    @id @default(cuid())
  clerkId       String    // the family's Clerk user, created at step 4 (find-or-create)
  parentEmail   String
  childTokenHash String   @unique // hash of the httpOnly cookie value (child device)
  childSalt     String
  approveTokenHash String @unique // hash of the value embedded in the parent email link
  approveSalt   String
  status        String    @default("pending") // pending | approved | expired
  approvedAt    DateTime?
  expiresAt     DateTime
  createdAt     DateTime  @default(now())

  @@index([clerkId])
}
```

Mirrors the existing `ConsentVerification` shape (hash+salt, never raw tokens at rest, explicit
expiry) rather than inventing a new pattern.

## 5. Clerk identity strategy — decision + why

Hard constraint found in `prisma/schema.prisma`: **`ParentalConsent.clerkId` and
`ConsentVerification.clerkId` are both non-nullable and unique** (lines 81–94, 100–110). Every
consent-related row requires an already-existing Clerk user ID — there is no schema path for
"pending consent" keyed purely by email or an anonymous token.

**Decision:** create the family's Clerk user at step 4 (allowlisted email submitted), using the
parent's email as that Clerk account's identifier, via `@clerk/backend`
`clerkClient.users.getUserList({emailAddress:[email]})` → create if absent. Rationale:

- Reuses 100% of existing consent logic (`hasValidConsent`, `recordConsent`,
  `academyEntryRedirect`) with **zero changes** to those tables or that state machine.
- An allowlisted account with no consent yet is already a first-class, fail-closed-handled state
  today (redirects to `/consent`) — this flow just reaches that state a different way.
- `User.clerkId` is already nullable (`prisma/schema.prisma` line ~11), so a Clerk identity can
  exist before the app-level `User`/`Monster` rows are created — no schema change needed there
  either.
- The pre-approval Clerk user holds only an email, is unusable for anything (every gated route
  stays fail-closed without verified consent), so its early creation carries no real exposure.

**Rejected alternative:** a fully email-keyed pending table, decoupled from Clerk, converting to
a real Clerk user only after approval. Rejected — it forks the "not consented yet" state into two
parallel representations (pre-approval table vs. post-approval Prisma tables) for no real benefit,
since the schema already tolerates the pre-consent state via the allowlist-gate path.

**New explicit dependency:** `@clerk/backend` is currently only a *transitive* dependency of
`@clerk/nextjs` (confirmed via `node_modules/@clerk/nextjs/package.json` and
`package-lock.json`, not in our own `package.json`). Add it as a direct pinned dependency since
we now call it directly (`clerkClient`, `signInTokens.createSignInToken`).

## 6. New/changed API routes

| Route | Method | Auth | Body | Response | Side effects |
|---|---|---|---|---|---|
| `/api/access-request` (new) | POST | none (public, rate-limited by IP) | `{parentEmail}` | always `{ok:true}` — identical shape regardless of allowlist result (no allowlist-membership oracle) | if allowlisted: find/create Clerk user, create `AccessRequest`, set httpOnly cookie, send email. If not: no side effects at all — response is indistinguishable |
| `/api/access-request/status` (new) | GET | reads httpOnly child cookie if present | — | `{status:"pending"}` \| `{status:"approved", ticket}` \| `{status:"expired"}`. **No cookie at all** (the not-allowlisted case never got one) → also `{status:"pending"}`, same as a real pending request — never a distinct error, so the response alone never confirms whether an email was invited | ticket only ever returned once, request marked consumed |
| `/consent` (existing page, extended) | — | — | accepts optional `?token=` (the approve token) in addition to today's signed-in-user path | on submit success: existing `verify` behavior **+** looks up `AccessRequest` by hashed approve-token, marks approved, mints sign-in ticket | reuses existing form/UI/copy as-is |
| `/api/consent/verify` (existing) | POST | existing | existing **+** optional `approveToken` | existing **+** `ticket` field when `approveToken` present | existing behavior unchanged for the direct-parent path (no token) |

Since a not-allowlisted submission never receives a cookie, its poll requests can only ever see
`{status:"pending"}` — server-side there is nothing to expire. The waiting screen therefore
enforces its **own** client-side timeout (a plain local timer started at submission time, no
server round-trip needed) and, past it, shows a generic "если долго нет ответа — попроси
родителя проверить письмо (в т.ч. спам) или написать нам" — the same message a genuinely
invited-but-non-responsive parent produces. The child can never tell the two cases apart.

## 7. Email

New template `src/emails/parent-approval.tsx`, following the `weekly-report.tsx` react-email
pattern (JSX components, not the hand-built HTML strings in `consent-email.ts`) — this is the
first transactional email that needs a clickable link/button, and react-email is the
already-adopted safe way to render that (auto-escaping, previewable), vs. string concatenation.
Sent via the same `RESEND_API_KEY`/`RESEND_FROM` config already required in production.

## 8. Security

- **Two independent opaque tokens**, both crypto-random (32 bytes), both stored **hashed +
  salted at rest** (reuse the existing pepper pattern — `CONSENT_CODE_PEPPER`,
  `ConsentVerification.codeHash`/`salt` convention):
  - *child token* → httpOnly, Secure, SameSite=Lax cookie on the child's device only. Never
    logged, never emailed, never rendered in any URL.
  - *approve token* → embedded only in the parent's email link. Single-use; invalidated the
    moment `/consent` consumes it.
- **No allowlist-membership oracle**: `/api/access-request` and the status-poll both respond
  identically whether or not the email is/was allowlisted (§6) — the child-facing UI has exactly
  one waiting state and one timeout state, full stop, so there is no copy variant that could leak
  invite-list membership.
- **Rate limits** via the existing `@/lib/ratelimit` `rateLimit()` helper (already used by
  `consent/request-code`): per-IP on `POST /api/access-request`, per-child-token on the status
  poll.
- **Expiry:** 48h per `AccessRequest` for the real (allowlisted) case — same order of magnitude
  as the existing consent-code TTL; the row moves to `expired` server-side and the
  child sees a "ссылка устарела, попробуй снова" state rather than polling forever.
- **Ticket handoff:** the sign-in ticket is only ever placed in the authenticated
  (cookie-gated) status-poll JSON response — never in a URL, never logged, single delivery.
- **Allowlist check runs first**, before any Clerk user is created or any email is sent —
  preserves the closed-test posture (decision 3): a non-invited email produces zero
  side-effects, not just a hidden one.

## 9. Landing page changes (`src/app/page.tsx`)

- Header's two parent-framed buttons collapse to one small secondary link — *"Я родитель — войти"*
  (→ `/sign-in`, kept for parents who prefer to create their own account directly; behavior
  unchanged).
- The existing silhouette flow (`InteractiveShowcase`, already public/unauthenticated) becomes
  the single obvious primary action, with its CTA copy switched to speak to whoever is reading —
  since that's frequently the child themself, per decision 1–2.
- Post-silhouette screen (new, §3 step 3) picks up the second-person-child voice already used
  elsewhere in onboarding (e.g. `src/lib/silhouette.ts`'s *"Твой питомец почти проснулся…"*),
  instead of dropping into a Clerk form.

## 10. Explicit non-goals (this iteration)

- Not removing `/sign-in`/`/sign-up` — kept as-is for parents who want to create the account
  themselves first.
- Not touching consent *content*/legal copy — `docs/COPPA-CONSENT-SPEC.md` still governs that.
- Not building push notifications for approval — polling only (simplest thing that works; an
  upgrade path, not a requirement now).
- Not handling multiple children per parent email in this pass — one `AccessRequest` → one Clerk
  user → one child profile, same 1:1 model as today.

## 11. Migration / rollout

- New `AccessRequest` Prisma model → `prisma migrate diff --from-empty --to-schema
  prisma/schema.prisma --script` → apply via `scripts/turso-db-push.mjs` (the established
  workaround for the libSQL driver-adapter, since `prisma migrate status` doesn't understand
  `libsql://` directly — same approach used for every prior migration this project).
- New required env: none beyond what's already documented (`RESEND_API_KEY`, `RESEND_FROM`,
  `ALLOWLIST_EMAILS`, `CONSENT_CODE_PEPPER` all already present in `.env.example`).
- New dependency: `@clerk/backend` promoted from transitive to a direct, pinned dependency.

## 12. Open item for CEO review

§6's `/api/access-request` response-shape note (no allowlist oracle) and §8's soft-decline copy
are my own security-driven call, not yet run past the CEO — flagging here rather than blocking
the rest of the spec on it, since it's reversible (a copy/response-shape choice, not an
irreversible action) and the rest of the design doesn't depend on which way it's decided.
