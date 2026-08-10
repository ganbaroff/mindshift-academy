# Operator smoke — local closed-pilot self-test

**Purpose:** One operator runs a single test-parent journey on `localhost:3000` before trusting a deploy.
**Prepare-only:** lists env **names** and steps — never paste secrets into chat or this doc.

**Branch context:** `docs/closed-test-audit-grill` (local HEAD). No deploy, no push, no prod writes.

---

## 0. Preconditions (prepare `.env.local`)

Copy [`.env.example`](../../.env.example) → `.env.local` and fill values locally (outside chat).

| Variable | Why (local smoke) |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk auth (test `pk_test_…` is fine) |
| `CLERK_SECRET_KEY` | Server-side Clerk |
| `DATABASE_URL` | `file:./dev.db` for local SQLite (default in example) |
| `ALLOWLIST_EMAILS` | **Required for allowlist gate** — one test parent email, lowercase, e.g. `you@example.com` |
| `CONSENT_CODE_PEPPER` | Any long random string locally; required in prod, recommended locally for access-code hashing |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` (activation links in CLI output) |
| `RESEND_API_KEY` + `RESEND_FROM` | Optional locally — consent UI shows the 6-digit code in dev when email is not sent |
| `CLERK_SECRET_KEY` (again) | Needed by `scripts/generate-access-codes.mjs` when minting child codes |

**Not needed for gate-only smoke:** Turso, Upstash, Azure/Gemini/NVIDIA (session AI will 503 without them — that is OK for auth/consent/code path).

**Apply schema once (if `dev.db` is fresh):**

```powershell
npm install
npx prisma generate
node scripts/turso-db-push.mjs
```

Start dev server:

```powershell
npm run dev
```

Open `http://localhost:3000`.

---

## 1. Google OAuth must stay dead (PASS/FAIL)

On **`/sign-in`** and **`/sign-up`**:

- [ ] **PASS:** Only email + password fields; no “Continue with Google”, no OAuth divider (“or”).
- [ ] **FAIL:** Any Google / social button visible or clickable → stop; CSS hide in `src/app/globals.css` is broken.

Strangers using Google would hit Google’s `invalid_request / missing client_id` — the button must not appear.

---

## 2. Allowlist gate (PASS/FAIL)

### 2a. Stranger (negative)

1. Sign up or sign in with an email **not** in `ALLOWLIST_EMAILS`.
2. [ ] **PASS:** Redirect to `/no-access`.
3. [ ] **PASS:** Page shows **«Оставить заявку»** linking to `/request-access`.
4. Submit the request form with a throwaway email.
5. [ ] **PASS:** “Заявка принята” — no access granted.

### 2b. Test parent (positive)

Use the exact email listed in `ALLOWLIST_EMAILS`.

1. From `/`, choose **«Я взрослый — начать»** (or `/sign-up`).
2. Create account / sign in with the allowlisted email.
3. [ ] **PASS:** Lands on `/consent`, **not** `/no-access`.

---

## 3. Parent consent (PASS/FAIL)

On `/consent`:

1. Click **«Отправить код»**.
2. [ ] **PASS (dev):** UI shows the 6-digit code inline (`Локальная разработка: код показан ниже`).
   [ ] **PASS (with Resend):** “Код отправлен на …” and code arrives by email.
3. Enter code, tick **both** opt-in checkboxes, submit.
4. [ ] **PASS:** Redirect to `/onboarding` or `/dashboard` (not stuck on consent).

Optional automated check: `npm run test:consent` (uses local DB).

---

## 4. Child access code (PASS/FAIL)

In a **second terminal** (same repo, same `.env.local` loaded):

```powershell
node scripts/generate-access-codes.mjs you@example.com
```

Replace with your allowlisted parent email. Script prints once:

- `CODE` — 8 characters for the child (`/enter-code`)
- `ACTIVATE` — one-time parent link (`/activate?t=…`)

**Parent device (can be same browser, incognito, or another profile):**

1. Open the **ACTIVATE** URL.
2. Confirm email matches the allowlisted parent.
3. Tick both consent boxes → activate.
4. [ ] **PASS:** Success message; code is now active.

**Child path:**

1. Open `/enter-code` (or **«У ребёнка уже есть код»** on `/`).
2. Type the 8-character code (paste OK).
3. [ ] **PASS:** Silent sign-in → `/onboarding` (hatch / name monster).

Re-entering the same code after Clerk session expiry should still work until code expiry (returning-child path).

---

## 5. Optional deeper smoke (not blocking gate)

Only if AI keys are configured in `.env.local`:

- Complete onboarding → `/session/w1-s1` loads.
- Parent `/dashboard` shows progress after a session attempt.

Without keys, expect 503 on chat — **not** a failure for steps 1–4.

---

## 6. Quick reference

| Route | Role |
|---|---|
| `/` | Landing; parent vs child entry |
| `/sign-in`, `/sign-up` | Clerk email/password only (no Google) |
| `/no-access` | Denied parent → link to `/request-access` |
| `/request-access` | Public waitlist form (grants nothing) |
| `/consent` | Parent 6-digit verification + opt-ins |
| `/activate?t=…` | Parent one-time code activation |
| `/enter-code` | Child 8-character code redemption |

Operator runbook for production grants: [`docs/PARENT-ACCESS-RUNBOOK.md`](../PARENT-ACCESS-RUNBOOK.md).

---

## Residual blockers (CEO / not fixed here)

- **Pedagogy guide in session** — not wired; needs product/design approval (out of scope).
- **Production deploy** — prod still serves pre-local-HEAD build; parity in `docs/release/W0-PROD-LOCAL-PARITY-2026-07-31.md`.
- **Legal / COPPA sign-off** for public launch — engineering implements mechanism only.
- **Full curriculum (weeks 2–5), certificate route, gacha removal** — tracked in pilot readiness, not this smoke.
- **Real email in prod** — requires verified Resend domain + `RESEND_FROM` (local dev bypasses via inline code).
