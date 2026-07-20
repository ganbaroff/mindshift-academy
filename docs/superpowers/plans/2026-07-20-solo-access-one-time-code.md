# Solo Access via One-Time Parent Code — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a child open a shared link and get an authenticated session **alone** by typing a one-time code a parent gave them once — no parent at the child's device, no Clerk form for the child.

**Architecture:** Admin generates hashed `AccessCode` rows (one per allowlisted parent email). The parent opens a one-time **activation** link on their own device, ticks the two existing consent opt-ins → that find-or-creates the family's Clerk user, records `ParentalConsent`, and flips the code to `active`. The child types the code on a kid-friendly screen → the server mints a Clerk **sign-in ticket** (`@clerk/backend` `signInTokens.createSignInToken`) → the child's browser silently signs in (`useSignIn().create({strategy:"ticket"})`) and lands in the existing `/onboarding`. The existing fail-closed `hasValidConsent()` gate is unchanged; code redemption is just a new, lighter way to reach the already-handled "consent valid" state.

**Tech Stack:** Next.js 16 (App Router, `src/proxy.ts` boundary) · `@clerk/nextjs` 7.5.7 (client `useSignIn`) · `@clerk/backend` 3.8.2 (server `createClerkClient`, `signInTokens`, `users`) · Prisma 7 + `@prisma/adapter-libsql` over Turso · Upstash rate limit · Resend email · custom `.mjs` test harness (no jest/pytest — this repo prints PASS/FAIL and exits).

## Global Constraints

- **Keep the fail-closed consent architecture.** Never weaken `hasValidConsent()` / gate order. Code redemption must end in a real `ParentalConsent` row via the existing `recordConsent()`.
- **Codes are hashed at rest**, never stored raw — reuse the exact `consent.ts` pattern: `HMAC-SHA256(code, salt + pepper)`, per-row random `salt`, pepper from env. Constant-time compare (`crypto.timingSafeEqual`).
- **Kid-safe code alphabet:** `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (30 chars — excludes `0 O 1 I L`). Length **8**, displayed in two groups of 4. Input auto-uppercases, trims whitespace, accepts paste.
- **Child sees zero consent/legal UI.** The two opt-ins live only on the parent activation screen (consent posture B, spec §0).
- **Public redeem/activate endpoints fail-closed on rate-limit misconfig in prod** (`rateLimitMisconfiguredInProd()` → 503) and key off `publicClientKey(req)` (429 if no trusted IP in prod). Never a shared anonymous bucket.
- **Secret handling:** `CLERK_SECRET_KEY` and the pepper are read from `process.env` only; never logged. Generated codes are printed by the admin script to the operator's own terminal only.
- **Child-facing copy is Russian** (matches the current app interior). Parent activation copy reuses the frozen consent copy.
- **Migrations** apply via `scripts/turso-db-push.mjs` (the libSQL-adapter workaround), not `prisma migrate deploy`.
- **Reuse env pepper:** use the existing `CONSENT_CODE_PEPPER` for access-code hashing too (one pepper, already provisioned) — do **not** introduce a second pepper env.

---

## File Structure

**Create:**
- `src/lib/access-code.ts` — pure/data layer: kid-safe code generation, HMAC hashing, DB create/validate/consume of `AccessCode`. No Clerk, no HTTP — independently unit-testable.
- `src/lib/clerk-backend.ts` — isolated `@clerk/backend` singleton + `findOrCreateUserByEmail(email)` + `mintSignInTicket(userId)`. The only file that talks to the Clerk Backend API.
- `src/app/api/access-code/activate/route.ts` — `POST` parent activation (token-gated, not Clerk-auth): validate activation token → find/create Clerk user → `recordConsent()` → mark code `active`.
- `src/app/api/access-code/redeem/route.ts` — `POST` child redemption (public, rate-limited): validate active code → mint ticket → `{ ticket }`.
- `src/app/activate/page.tsx` — parent activation screen (reuses the two consent opt-ins), reads `?t=<activationToken>`.
- `src/app/enter-code/page.tsx` — child code-entry screen (segmented input) → redeem → ticket sign-in → `/onboarding`.
- `scripts/generate-access-codes.mjs` — admin CLI: generate a batch of codes for allowlisted emails, print codes + activation links to the operator's terminal.
- `tests/access-code.test.mjs` — pure unit tests for `src/lib/access-code.ts` (generation alphabet, hash determinism, no-raw-storage, validate/consume state machine) in the repo's `.mjs` PASS/FAIL style.

**Modify:**
- `prisma/schema.prisma` — add the `AccessCode` model.
- `src/lib/request-access.ts` — add `/api/access-code/redeem` and `/api/access-code/activate` to `PUBLIC_API_PATHS`.
- `src/app/page.tsx` — child-first primary CTA → `/enter-code`; demote parent sign-in to a small secondary link.
- `.env.example` — document `CLERK_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`, and note `CONSENT_CODE_PEPPER` now also peppers access codes.
- `package.json` — add `@clerk/backend@3.8.2` as a direct dependency; add `"gen:codes": "node scripts/generate-access-codes.mjs"`.
- `tests/deterministic.mjs` — add a static guard that `redeem`/`activate` are declared public and that `access-code.ts` never persists a raw code.

---

## Task 1: `AccessCode` Prisma model + Turso migration

**Files:**
- Modify: `prisma/schema.prisma` (after the `ConsentVerification` model, ~line 110)
- Run: `scripts/turso-db-push.mjs`

**Interfaces:**
- Produces: Prisma model `AccessCode { id, codeHash, salt, issuedForEmail, status, clerkId?, activationTokenHash, activationSalt, serviceConsent, externalAiConsent, consentIp?, activatedAt?, redeemedAt?, expiresAt, createdAt }`. `status ∈ {"issued","active","redeemed","revoked"}`. `codeHash @unique`, `activationTokenHash @unique`.

- [ ] **Step 1: Add the model to the schema**

Append to `prisma/schema.prisma`:

```prisma
// One-time child-access code (docs/superpowers/specs/2026-07-19-child-async-access-design.md).
// Lifecycle: issued -> (parent activates: find/create Clerk user + record consent) active
//   -> (child redeems: mint sign-in ticket) redeemed. Raw code & raw activation token are
// NEVER stored — only HMAC-SHA256(value, salt + CONSENT_CODE_PEPPER) digests. Both digests are
// @unique so a lookup is an indexed point-read and a duplicate can't silently coexist.
model AccessCode {
  id                  String    @id @default(cuid())
  codeHash            String    @unique // HMAC of the kid-facing code
  salt                String
  issuedForEmail      String // allowlisted parent email this code authorizes
  status              String    @default("issued") // issued | active | redeemed | revoked
  clerkId             String? // set at activation (find-or-create Clerk user)
  activationTokenHash String    @unique // HMAC of the parent activation-link token
  activationSalt      String
  serviceConsent      Boolean   @default(false) // captured at activation
  externalAiConsent   Boolean   @default(false)
  consentIp           String?
  activatedAt         DateTime?
  redeemedAt          DateTime?
  expiresAt           DateTime
  createdAt           DateTime  @default(now())
}
```

- [ ] **Step 2: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: `✔ Generated Prisma Client` with no schema errors.

- [ ] **Step 3: Generate the DDL and apply it to Turso**

Run:
```bash
npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script > /tmp/access.sql 2> /tmp/access.err
node scripts/turso-db-push.mjs
```
Expected: `turso-db-push.mjs` prints the target host, an applied-statement count that includes a `CREATE TABLE "AccessCode"` (idempotent `IF NOT EXISTS`), and lists `AccessCode` among the resulting tables. (The script reads `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` from `.env`; it never prints secret values.)

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(access): AccessCode table for one-time child access codes"
```

---

## Task 2: `src/lib/access-code.ts` — code generation, hashing, DB lifecycle (pure/data)

**Files:**
- Create: `src/lib/access-code.ts`
- Test: `tests/access-code.test.mjs`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`.
- Produces:
  - `generateCode(): string` — 8 chars from the kid-safe alphabet.
  - `hashAccessValue(value: string, salt: string): string` — HMAC-SHA256 with `salt + CONSENT_CODE_PEPPER`.
  - `normalizeCode(raw: string): string` — uppercase, strip everything not in the alphabet.
  - `createAccessCode(issuedForEmail: string, ttlDays?: number): Promise<{ id: string; code: string; activationToken: string }>` — persists a row (`status:"issued"`), returns raw code + raw activation token ONCE.
  - `activateAccessCode(activationToken: string, opts: { serviceConsent: boolean; externalAiConsent: boolean; clerkId: string; consentIp?: string | null }): Promise<{ ok: boolean; issuedForEmail?: string; reason?: string }>` — flips `issued -> active`, stores clerkId+consent.
  - `findActivationByToken(activationToken: string): Promise<{ id: string; issuedForEmail: string; status: string } | null>` — for the activation screen to show which email it's for.
  - `redeemAccessCode(rawCode: string): Promise<{ ok: boolean; clerkId?: string; reason?: string }>` — validates `status:"active"`, not expired, then flips `active -> redeemed` and returns the `clerkId` to mint a ticket for.

- [ ] **Step 1: Write the failing unit tests**

Create `tests/access-code.test.mjs` (repo `.mjs` PASS/FAIL idiom — mirror `tests/deterministic.mjs` structure). These cover only the PURE functions (no DB):

```js
import assert from "node:assert";
import { generateCode, hashAccessValue, normalizeCode } from "../src/lib/access-code.ts";

let pass = 0, fail = 0;
const test = (name, fn) => { try { fn(); console.log("  PASS ", name); pass++; }
  catch (e) { console.log("  FAIL ", name, "-", e.message); fail++; } };

console.log("=== ACCESS-CODE: generation + hashing ===");

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
test("code is 8 chars from the kid-safe alphabet (no 0 O 1 I L)", () => {
  for (let i = 0; i < 200; i++) {
    const c = generateCode();
    assert.equal(c.length, 8);
    for (const ch of c) assert.ok(ALPHABET.includes(ch), `illegal char ${ch}`);
    assert.ok(!/[01OIL]/.test(c), `ambiguous char in ${c}`);
  }
});
test("generateCode is effectively unique across a batch", () => {
  const seen = new Set();
  for (let i = 0; i < 500; i++) seen.add(generateCode());
  assert.ok(seen.size > 490, `too many collisions: ${seen.size}/500`);
});
test("normalizeCode uppercases and strips separators/ambiguous input", () => {
  assert.equal(normalizeCode(" k7p9-qr4t "), "K7P9QR4T");
  assert.equal(normalizeCode("k7p9 qr4t"), "K7P9QR4T");
});
test("hash is deterministic for same (value, salt) and differs by salt", () => {
  const a = hashAccessValue("K7P9QR4T", "saltA");
  const b = hashAccessValue("K7P9QR4T", "saltA");
  const c = hashAccessValue("K7P9QR4T", "saltB");
  assert.equal(a, b);
  assert.notEqual(a, c);
  assert.match(a, /^[0-9a-f]{64}$/);
});

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --experimental-strip-types tests/access-code.test.mjs`
Expected: FAIL — cannot import from `../src/lib/access-code.ts` (module does not exist).

> Note: this repo runs `.ts` libs from `.mjs` tests via Node's native type-stripping. If `--experimental-strip-types` is unavailable in the installed Node, mirror whatever `tests/deterministic.mjs` already does to import from `src/lib/*.ts` and match that exact invocation. Confirm by reading the top of `tests/deterministic.mjs` and its npm script before writing this line.

- [ ] **Step 3: Implement `src/lib/access-code.ts`**

```ts
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";

// Kid-safe alphabet: excludes 0/O/1/I/L to avoid the ClassDojo "O vs 0, I vs l" failure mode.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LEN = 8;
const DEFAULT_TTL_DAYS = 30;

export function generateCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LEN; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

/** Uppercase and keep only alphabet chars — makes child input forgiving (spaces, dashes, case). */
export function normalizeCode(raw: string): string {
  return (raw || "").toUpperCase().split("").filter((c) => ALPHABET.includes(c)).join("");
}

/** HMAC-SHA256(value, salt + CONSENT_CODE_PEPPER). Raw values are never stored — only this digest. */
export function hashAccessValue(value: string, salt: string): string {
  const pepper = process.env.CONSENT_CODE_PEPPER ?? "";
  return crypto.createHmac("sha256", salt + pepper).update(value).digest("hex");
}

function randomToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Issue a code for an allowlisted parent email. Returns raw code + raw activation token ONCE. */
export async function createAccessCode(
  issuedForEmail: string,
  ttlDays: number = DEFAULT_TTL_DAYS
): Promise<{ id: string; code: string; activationToken: string }> {
  const code = generateCode();
  const salt = crypto.randomBytes(16).toString("hex");
  const activationToken = randomToken();
  const activationSalt = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

  const row = await prisma.accessCode.create({
    data: {
      codeHash: hashAccessValue(code, salt),
      salt,
      issuedForEmail: issuedForEmail.trim().toLowerCase(),
      activationTokenHash: hashAccessValue(activationToken, activationSalt),
      activationSalt,
      expiresAt,
    },
  });
  return { id: row.id, code, activationToken };
}

/** Find the row for an activation token (constant-time-ish via unique hash lookup). */
export async function findActivationByToken(
  activationToken: string
): Promise<{ id: string; issuedForEmail: string; status: string } | null> {
  // The hash embeds a per-row salt, so we can't hash-then-lookup blindly. Look up candidates by
  // recomputing: activation tokens are rare (closed test) — scan issued/active rows and compare.
  const rows = await prisma.accessCode.findMany({
    where: { status: { in: ["issued", "active"] } },
    select: { id: true, issuedForEmail: true, status: true, activationTokenHash: true, activationSalt: true },
  });
  for (const r of rows) {
    const cand = hashAccessValue(activationToken, r.activationSalt);
    const a = Buffer.from(cand), b = Buffer.from(r.activationTokenHash);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { id: r.id, issuedForEmail: r.issuedForEmail, status: r.status };
    }
  }
  return null;
}

export async function activateAccessCode(
  activationToken: string,
  opts: { serviceConsent: boolean; externalAiConsent: boolean; clerkId: string; consentIp?: string | null }
): Promise<{ ok: boolean; issuedForEmail?: string; reason?: string }> {
  const found = await findActivationByToken(activationToken);
  if (!found) return { ok: false, reason: "not_found" };
  if (found.status === "redeemed") return { ok: false, reason: "already_redeemed" };
  const updated = await prisma.accessCode.update({
    where: { id: found.id },
    data: {
      status: "active",
      clerkId: opts.clerkId,
      serviceConsent: opts.serviceConsent,
      externalAiConsent: opts.externalAiConsent,
      consentIp: opts.consentIp ?? null,
      activatedAt: new Date(),
    },
  });
  return { ok: true, issuedForEmail: updated.issuedForEmail };
}

/** Child redeems a code: must be active + not expired. Flips to redeemed and returns the clerkId. */
export async function redeemAccessCode(
  rawCode: string
): Promise<{ ok: boolean; clerkId?: string; reason?: string }> {
  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LEN) return { ok: false, reason: "malformed" };
  // Salt is per-row → scan active, unredeemed rows and constant-time compare.
  const rows = await prisma.accessCode.findMany({
    where: { status: "active" },
    select: { id: true, codeHash: true, salt: true, clerkId: true, expiresAt: true },
  });
  for (const r of rows) {
    const cand = hashAccessValue(code, r.salt);
    const a = Buffer.from(cand), b = Buffer.from(r.codeHash);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      if (r.expiresAt.getTime() < Date.now()) return { ok: false, reason: "expired" };
      if (!r.clerkId) return { ok: false, reason: "not_activated" };
      // Atomic single-use: only flip if still active (guards double-redeem races).
      const res = await prisma.accessCode.updateMany({
        where: { id: r.id, status: "active" },
        data: { status: "redeemed", redeemedAt: new Date() },
      });
      if (res.count !== 1) return { ok: false, reason: "already_redeemed" };
      return { ok: true, clerkId: r.clerkId };
    }
  }
  return { ok: false, reason: "invalid" };
}
```

> Scan-and-compare (rather than hash-then-index) is deliberate: the hash embeds a per-row salt, so a direct indexed lookup isn't possible, and for a closed test the active-row set is tiny. If the code volume ever grows, switch to a peppered *keyed* hash without per-row salt so `codeHash` can be looked up directly — noted, not needed now.

- [ ] **Step 4: Run the pure tests to verify they pass**

Run: `node --experimental-strip-types tests/access-code.test.mjs`
Expected: PASS — all generation/normalize/hash assertions green.

- [ ] **Step 5: Add the test to the deterministic suite + commit**

Wire `tests/access-code.test.mjs` into the `test:all` chain in `package.json` (append `&& node --experimental-strip-types tests/access-code.test.mjs`), then:
```bash
git add src/lib/access-code.ts tests/access-code.test.mjs package.json
git commit -m "feat(access): access-code generation, hashing, and lifecycle (pure+data)"
```

---

## Task 3: `src/lib/clerk-backend.ts` — Clerk Backend API isolation (find-or-create user + mint ticket)

**Files:**
- Create: `src/lib/clerk-backend.ts`
- Modify: `package.json` (add `@clerk/backend` direct dep)

**Interfaces:**
- Consumes: `createClerkClient` from `@clerk/backend`; `process.env.CLERK_SECRET_KEY`.
- Produces:
  - `findOrCreateUserByEmail(email: string): Promise<string>` — returns a Clerk `userId`.
  - `mintSignInTicket(userId: string, expiresInSeconds?: number): Promise<string>` — returns the ticket string (`SignInToken.token`).

- [ ] **Step 1: Add `@clerk/backend` as a direct dependency**

Run: `npm install @clerk/backend@3.8.2 --save-exact`
Expected: `package.json` `dependencies` now lists `"@clerk/backend": "3.8.2"` (it was only transitive before). `npm ls @clerk/backend` shows a single deduped 3.8.2.

- [ ] **Step 2: Implement the isolation module**

```ts
import { createClerkClient } from "@clerk/backend";

// The ONLY module that talks to the Clerk Backend API. Everything else depends on these two
// thin wrappers so the surface stays small and mockable. secretKey is read once from env.
const secretKey = process.env.CLERK_SECRET_KEY;

function client() {
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not set — cannot use the Clerk Backend API.");
  return createClerkClient({ secretKey });
}

/** Find an existing Clerk user by primary email, or create a passwordless one. Returns userId. */
export async function findOrCreateUserByEmail(email: string): Promise<string> {
  const clerk = client();
  const normalized = email.trim().toLowerCase();
  const existing = await clerk.users.getUserList({ emailAddress: [normalized] });
  if (existing.data.length > 0) return existing.data[0].id;
  const created = await clerk.users.createUser({
    emailAddress: [normalized],
    skipPasswordRequirement: true,
  });
  return created.id;
}

/** Mint a single-use Clerk sign-in ticket for a user. The child's browser consumes it. */
export async function mintSignInTicket(
  userId: string,
  expiresInSeconds = 15 * 60
): Promise<string> {
  const clerk = client();
  const t = await clerk.signInTokens.createSignInToken({ userId, expiresInSeconds });
  return t.token;
}
```

> **Verify against the installed types before finishing this task:** open `node_modules/@clerk/backend/dist/api/endpoints/UserApi.d.ts` and confirm the exact `getUserList` filter key (`emailAddress`) and `createUser` params (`emailAddress`, `skipPasswordRequirement`). `signInTokens.createSignInToken({ userId, expiresInSeconds })` returning `{ token }` is already confirmed in `node_modules/@clerk/backend/dist/api/endpoints/SignInTokenApi.d.ts` + `resources/SignInTokens.d.ts`. Adjust the two `users.*` calls if the installed d.ts differs.

- [ ] **Step 3: Add a structural test to the deterministic suite**

In `tests/deterministic.mjs` add a guard (read-file assertion, no live Clerk call — the repo does this for other modules):

```js
// clerk-backend.ts must isolate the Backend API and never log the secret
{
  const src = readFileSync("src/lib/clerk-backend.ts", "utf8");
  test("clerk-backend uses createClerkClient with CLERK_SECRET_KEY", () =>
    assert.ok(src.includes("createClerkClient(") && src.includes("CLERK_SECRET_KEY")));
  test("clerk-backend never console-logs the secret", () =>
    assert.ok(!/console\.\w+\([^)]*secretKey/.test(src)));
  test("clerk-backend exposes findOrCreateUserByEmail + mintSignInTicket", () =>
    assert.ok(src.includes("findOrCreateUserByEmail") && src.includes("mintSignInTicket")));
}
```

- [ ] **Step 4: Run the deterministic suite**

Run: `npm test`
Expected: PASS including the three new `clerk-backend` guards.

- [ ] **Step 5: Commit**

```bash
git add src/lib/clerk-backend.ts package.json package-lock.json tests/deterministic.mjs
git commit -m "feat(access): isolate Clerk Backend API (find-or-create user + mint sign-in ticket)"
```

---

## Task 4: `scripts/generate-access-codes.mjs` — admin batch code generator (operator-only)

**Files:**
- Create: `scripts/generate-access-codes.mjs`
- Modify: `package.json` (add `"gen:codes"` script)

**Interfaces:**
- Consumes: `createAccessCode` from `src/lib/access-code.ts`; `isEmailAllowed` from `src/lib/access.ts`; `NEXT_PUBLIC_APP_URL`.
- Produces: prints, per email, the raw code and the activation URL `${APP_URL}/activate?t=<activationToken>` to the operator's terminal only.

- [ ] **Step 1: Implement the script**

```js
// Usage: node scripts/generate-access-codes.mjs parent1@example.com parent2@example.com
// Generates one AccessCode per email (must be allowlisted). Prints the code + activation link
// ONCE — they are not recoverable later (only hashes are stored). Operator hands the code to the
// parent, and the activation link too (or the parent opens it themselves).
import "dotenv/config";
import { createAccessCode } from "../src/lib/access-code.ts";
import { isEmailAllowed } from "../src/lib/access.ts";

const emails = process.argv.slice(2).map((e) => e.trim().toLowerCase()).filter(Boolean);
if (emails.length === 0) {
  console.error("Provide at least one parent email: node scripts/generate-access-codes.mjs a@b.com");
  process.exit(1);
}
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

for (const email of emails) {
  if (!isEmailAllowed(email)) {
    console.log(`SKIP  ${email} — not in ALLOWLIST_EMAILS`);
    continue;
  }
  const { code, activationToken } = await createAccessCode(email);
  console.log(`\nEMAIL:      ${email}`);
  console.log(`CODE:       ${code.slice(0, 4)} ${code.slice(4)}   (child types this)`);
  console.log(`ACTIVATE:   ${appUrl}/activate?t=${activationToken}   (parent opens once)`);
}
console.log("\nDone. Codes/links shown ONCE — not stored raw.");
process.exit(0);
```

- [ ] **Step 2: Dry-run it locally against the dev DB**

Run (with an allowlisted email in `.env`): `ALLOWLIST_EMAILS="you@example.com" node scripts/generate-access-codes.mjs you@example.com`
Expected: prints one EMAIL/CODE/ACTIVATE block; a non-allowlisted email prints `SKIP`.

- [ ] **Step 3: Add the npm script + commit**

Add to `package.json` scripts: `"gen:codes": "node scripts/generate-access-codes.mjs"`. Then:
```bash
git add scripts/generate-access-codes.mjs package.json
git commit -m "feat(access): admin CLI to batch-generate one-time access codes"
```

---

## Task 5: `POST /api/access-code/activate` — parent activation route

**Files:**
- Create: `src/app/api/access-code/activate/route.ts`
- Modify: `src/lib/request-access.ts` (add the path)

**Interfaces:**
- Consumes: `findActivationByToken`, `activateAccessCode` (Task 2); `findOrCreateUserByEmail` (Task 3); `recordConsent` from `@/lib/consent`; `rateLimit`, `rateLimitMisconfiguredInProd`, `publicClientKey` from `@/lib/ratelimit`.
- Produces: `POST { activationToken, serviceConsent, externalAiConsent }` → `{ ok: true }` (200) or `{ error }` (400/401/429/503). Also `GET ?t=<token>` → `{ email }` for the screen to show which email it authorizes.

- [ ] **Step 1: Add the route to the public API allow-list**

In `src/lib/request-access.ts`, add to `PUBLIC_API_PATHS`:
```ts
  "/api/access-code/activate", // token-gated parent activation; no Clerk session yet
  "/api/access-code/redeem", // public child redemption; rate-limited, code is the credential
```

- [ ] **Step 2: Implement the route**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, rateLimitMisconfiguredInProd, publicClientKey } from "@/lib/ratelimit";
import { findActivationByToken, activateAccessCode } from "@/lib/access-code";
import { findOrCreateUserByEmail } from "@/lib/clerk-backend";
import { recordConsent } from "@/lib/consent";

const schema = z.object({
  activationToken: z.string().min(20).max(200),
  serviceConsent: z.boolean(),
  externalAiConsent: z.boolean(),
});

// GET ?t=token → which email this activation authorizes (so the parent sees it before consenting).
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("t") ?? "";
  const found = await findActivationByToken(token);
  if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ email: found.issuedForEmail, status: found.status });
}

export async function POST(req: Request) {
  try {
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ error: "Service temporarily unavailable" }, { status: 503 });
    }
    const key = publicClientKey(req);
    if (!key) return NextResponse.json({ error: "Rate limit unavailable" }, { status: 429 });
    const rl = await rateLimit("access-activate", key, 10, 60);
    if (!rl.success) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    const { activationToken, serviceConsent, externalAiConsent } = parsed.data;

    if (!serviceConsent || !externalAiConsent) {
      return NextResponse.json(
        { code: "BOTH_CONSENTS_REQUIRED", error: "Нужны обе галочки." },
        { status: 400 }
      );
    }

    const found = await findActivationByToken(activationToken);
    if (!found) return NextResponse.json({ error: "not_found" }, { status: 404 });

    const clerkId = await findOrCreateUserByEmail(found.issuedForEmail);
    const consentIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ?? null;

    const res = await activateAccessCode(activationToken, {
      serviceConsent, externalAiConsent, clerkId, consentIp,
    });
    if (!res.ok) return NextResponse.json({ error: res.reason ?? "activate_failed" }, { status: 400 });

    // Reuse the existing fail-closed consent record so hasValidConsent() unlocks the child.
    await recordConsent({
      clerkId,
      parentEmail: found.issuedForEmail,
      serviceConsent,
      externalAiConsent,
      ipAddress: consentIp,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[access/activate] error:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Extend the anonymous-boundary test**

`tests/proxy-api-auth.test.mjs` asserts private routes reject anonymous requests. Add `/api/access-code/activate` and `/api/access-code/redeem` to that test's **public** set (they must NOT 401 anonymously) — assert an anonymous `POST` returns a non-401 (e.g. 400/429), proving they're intentionally public. Match the file's existing assertion style.

- [ ] **Step 4: Run the boundary test + build**

Run: `node tests/proxy-api-auth.test.mjs && npm run build`
Expected: PASS — the two new routes are recognized public; build compiles the new route handlers (`ƒ /api/access-code/activate` appears in the route list).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/access-code/activate/route.ts src/lib/request-access.ts tests/proxy-api-auth.test.mjs
git commit -m "feat(access): parent activation route (consent + find/create user + mark active)"
```

---

## Task 6: `src/app/activate/page.tsx` — parent activation screen

**Files:**
- Create: `src/app/activate/page.tsx`

**Interfaces:**
- Consumes: `GET /api/access-code/activate?t=` (shows the email), `POST /api/access-code/activate`. Reuses the two consent opt-in labels — copy verbatim from `src/app/consent/page.tsx` so the disclosure text stays identical.

- [ ] **Step 1: Implement the screen (client component, token from URL)**

```tsx
"use client";
import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ActivateInner() {
  const token = useSearchParams().get("t") ?? "";
  const [email, setEmail] = useState<string | null>(null);
  const [optA, setOptA] = useState(false);
  const [optB, setOptB] = useState(false);
  const [state, setState] = useState<"loading" | "form" | "done" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState("error"); setError("Ссылка неполная."); return; }
    fetch(`/api/access-code/activate?t=${encodeURIComponent(token)}`)
      .then((r) => r.ok ? r.json() : Promise.reject())
      .then((d) => { setEmail(d.email); setState("form"); })
      .catch(() => { setState("error"); setError("Ссылка недействительна или уже использована."); });
  }, [token]);

  const submit = async () => {
    setError(null);
    const r = await fetch("/api/access-code/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activationToken: token, serviceConsent: optA, externalAiConsent: optB }),
    });
    if (r.ok) setState("done");
    else { const d = await r.json().catch(() => ({})); setError(d.error === "BOTH_CONSENTS_REQUIRED" ? "Нужны обе галочки." : "Не удалось. Попробуйте ещё раз."); }
  };

  if (state === "loading") return <main className="min-h-screen grid place-items-center text-white/70">Загрузка…</main>;
  if (state === "error") return <main className="min-h-screen grid place-items-center px-6 text-center text-error">{error}</main>;
  if (state === "done") return (
    <main className="min-h-screen grid place-items-center px-6 text-center">
      <div className="max-w-md space-y-3">
        <p className="text-2xl font-semibold text-white">Готово ✅</p>
        <p className="text-white/70">Код активирован. Передайте его ребёнку — он войдёт сам, вам больше ничего делать не нужно.</p>
      </div>
    </main>
  );

  return (
    <main className="min-h-screen grid place-items-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-white">Разрешение для ребёнка</h1>
          <p className="text-sm text-white/60">Вы даёте согласие для аккаунта <strong className="text-white">{email}</strong>. Ребёнок будет заниматься сам; вам нужно только подтвердить один раз.</p>
        </div>
        {/* Copy these two labels VERBATIM from src/app/consent/page.tsx so disclosures match. */}
        <label className="flex gap-3 rounded-2xl border border-white/10 bg-surface/80 p-4 text-sm text-white/80">
          <input type="checkbox" checked={optA} onChange={(e) => setOptA(e.target.checked)} className="mt-1 h-5 w-5" />
          <span>{/* opt-in A label from consent/page.tsx */}Я разрешаю сбор и использование данных моего ребёнка для обучения в MindShift Academy.</span>
        </label>
        <label className="flex gap-3 rounded-2xl border border-white/10 bg-surface/80 p-4 text-sm text-white/80">
          <input type="checkbox" checked={optB} onChange={(e) => setOptB(e.target.checked)} className="mt-1 h-5 w-5" />
          <span>{/* opt-in B label from consent/page.tsx */}Я согласен(на) на обработку сообщений внешними ИI-сервисами (Google/NVIDIA) для проверки безопасности и ответов.</span>
        </label>
        {error && <p role="alert" className="text-sm text-error">{error}</p>}
        <button onClick={submit} disabled={!optA || !optB}
          className="h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-white disabled:opacity-50">
          Подтвердить и активировать код
        </button>
      </div>
    </main>
  );
}

export default function ActivatePage() {
  return <Suspense fallback={<main className="min-h-screen grid place-items-center text-white/70">Загрузка…</main>}><ActivateInner /></Suspense>;
}
```

> **Before committing:** open `src/app/consent/page.tsx`, copy the two opt-in label strings **verbatim** into the two `{/* ... */}` spots so the consent disclosure wording is byte-identical across both entry points (legal consistency).

- [ ] **Step 2: Verify it renders and gates on both checkboxes**

Run: `npm run build` then load `/activate?t=<token from Task 4 dry-run>` via the dev server.
Expected: shows the parent's email; the button is disabled until both boxes are ticked; submitting flips the code to `active` (re-running the child redeem in Task 7 then works).

- [ ] **Step 3: Commit**

```bash
git add src/app/activate/page.tsx
git commit -m "feat(access): parent activation screen (reuses consent opt-ins)"
```

---

## Task 7: `POST /api/access-code/redeem` — child redemption → sign-in ticket

**Files:**
- Create: `src/app/api/access-code/redeem/route.ts`

**Interfaces:**
- Consumes: `redeemAccessCode` (Task 2); `mintSignInTicket` (Task 3); `rateLimit`, `rateLimitMisconfiguredInProd`, `publicClientKey`.
- Produces: `POST { code }` → `{ ok: true, ticket }` (200) or `{ ok: false, error }` (400/429/503). The ticket is placed only in this JSON body — never a URL, never logged.

- [ ] **Step 1: Implement the route**

```ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, rateLimitMisconfiguredInProd, publicClientKey } from "@/lib/ratelimit";
import { redeemAccessCode } from "@/lib/access-code";
import { mintSignInTicket } from "@/lib/clerk-backend";

const schema = z.object({ code: z.string().min(1).max(40) });

export async function POST(req: Request) {
  try {
    if (rateLimitMisconfiguredInProd()) {
      return NextResponse.json({ ok: false, error: "Service temporarily unavailable" }, { status: 503 });
    }
    const key = publicClientKey(req);
    if (!key) return NextResponse.json({ ok: false, error: "Rate limit unavailable" }, { status: 429 });
    // Tight limit: brute-forcing an 8-char/30-alphabet space is infeasible at 8/min.
    const rl = await rateLimit("access-redeem", key, 8, 60);
    if (!rl.success) return NextResponse.json({ ok: false, error: "Слишком много попыток. Подожди минутку." }, { status: 429 });

    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });

    const res = await redeemAccessCode(parsed.data.code);
    if (!res.ok || !res.clerkId) {
      // Uniform soft failure — never reveal whether a code exists/was already used vs just wrong.
      return NextResponse.json({ ok: false, error: "Код не подошёл. Проверь и попробуй ещё раз." }, { status: 400 });
    }

    const ticket = await mintSignInTicket(res.clerkId);
    return NextResponse.json({ ok: true, ticket });
  } catch (error) {
    console.error("[access/redeem] error:", (error as { name?: string })?.name ?? "Error");
    return NextResponse.json({ ok: false, error: "Something went wrong" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Build to verify the route compiles**

Run: `npm run build`
Expected: `ƒ /api/access-code/redeem` appears in the route list; no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/access-code/redeem/route.ts
git commit -m "feat(access): child redemption route → mint Clerk sign-in ticket"
```

---

## Task 8: `src/app/enter-code/page.tsx` — child code-entry screen + ticket sign-in

**Files:**
- Create: `src/app/enter-code/page.tsx`

**Interfaces:**
- Consumes: `POST /api/access-code/redeem` → `{ ticket }`; `useSignIn` from `@clerk/nextjs`. On success: `signIn.create({ strategy: "ticket", ticket })` → `setActive({ session: signIn.createdSessionId })` → `router.push("/onboarding")`.

- [ ] **Step 1: Implement the segmented code screen**

```tsx
"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSignIn } from "@clerk/nextjs";

const LEN = 8;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const clean = (s: string) => s.toUpperCase().split("").filter((c) => ALPHABET.includes(c)).join("");

export default function EnterCodePage() {
  const router = useRouter();
  const { isLoaded, signIn, setActive } = useSignIn();
  const [chars, setChars] = useState<string[]>(Array(LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = (i: number, v: string) => {
    const cc = clean(v);
    setChars((prev) => {
      const next = [...prev];
      if (cc.length <= 1) { next[i] = cc; if (cc && i < LEN - 1) boxes.current[i + 1]?.focus(); }
      else { // paste of a full code
        for (let k = 0; k < LEN; k++) next[k] = cc[k] ?? "";
        boxes.current[Math.min(cc.length, LEN - 1)]?.focus();
      }
      return next;
    });
  };

  const submit = async () => {
    const code = chars.join("");
    if (code.length !== LEN || !isLoaded || busy) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch("/api/access-code/redeem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) { setError(d.error ?? "Код не подошёл."); setBusy(false); return; }
      const res = await signIn!.create({ strategy: "ticket", ticket: d.ticket });
      if (res.status === "complete") {
        await setActive!({ session: res.createdSessionId });
        router.push("/onboarding");
      } else { setError("Не удалось войти. Попробуй ещё раз."); setBusy(false); }
    } catch { setError("Что-то пошло не так. Попробуй ещё раз."); setBusy(false); }
  };

  return (
    <main className="min-h-screen grid place-items-center px-6 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Впиши секретный код</h1>
          <p className="text-sm text-white/60">Его дал тебе взрослый. Просто набери или вставь.</p>
        </div>
        <div className="flex justify-center gap-1.5" onPaste={(e) => { e.preventDefault(); setAt(0, e.clipboardData.getData("text")); }}>
          {chars.map((c, i) => (
            <input
              key={i} ref={(el) => { boxes.current[i] = el; }}
              value={c} inputMode="text" autoCapitalize="characters" maxLength={1}
              aria-label={`Символ ${i + 1}`}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Backspace" && !chars[i] && i > 0) boxes.current[i - 1]?.focus(); }}
              className="h-14 w-9 rounded-xl border border-white/15 bg-surface-strong/90 text-center text-xl font-bold uppercase text-white outline-none focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          ))}
        </div>
        {error && <p role="alert" className="text-sm font-medium text-error">{error}</p>}
        <button onClick={submit} disabled={busy || chars.join("").length !== LEN}
          className="h-12 w-full rounded-2xl bg-primary text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Заходим…" : "Продолжить"}
        </button>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the full loop end-to-end (dev)**

With the dev server running and a code generated (Task 4) + activated (Task 6): open `/enter-code`, type the code, submit.
Expected: the child is signed in via the ticket and lands on `/onboarding` (existing screen). Re-submitting the same code now fails softly ("Код не подошёл") because it's `redeemed`.

- [ ] **Step 3: Commit**

```bash
git add src/app/enter-code/page.tsx
git commit -m "feat(access): child code-entry screen + silent ticket sign-in"
```

---

## Task 9: Landing reframe — child-first primary action

**Files:**
- Modify: `src/app/page.tsx` (header links ~140-153; add a primary CTA in the hero ~164-169)

**Interfaces:**
- Consumes: nothing new. Adds a prominent child CTA → `/enter-code`; demotes the two parent-framed buttons to one small secondary "Я родитель" link → `/sign-in`.

- [ ] **Step 1: Replace the header's two parent buttons with one small parent link**

In `src/app/page.tsx`, within the header `div` (currently holding `parentDashboard` + `signIn` links), replace those two `<Link>`s with a single small secondary link (keep the RU/AZ toggle untouched):

```tsx
          <Link
            href="/sign-in"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-white/70 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            Я родитель
          </Link>
```

- [ ] **Step 2: Add a child-first primary CTA in the hero**

Immediately after the hero `<p>` subtitle block (the `t.subtitle` paragraph, ~line 168), add:

```tsx
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <Link
                href="/enter-code"
                className="inline-flex h-14 items-center gap-2 rounded-2xl bg-primary px-8 text-base font-semibold text-white shadow-[0_0_40px_rgba(139,92,246,0.35)] transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                У меня есть код — начать!
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <span className="text-sm text-white/50">Код тебе дал взрослый</span>
            </div>
```

> Keep it RU-only here (matches the app interior); the AZ toggle still controls the marketing copy above. `ArrowRight` is already imported in this file.

- [ ] **Step 3: Verify + build**

Run: `npm run build` and load `/` in the dev server.
Expected: a big "У меня есть код — начать!" button routing to `/enter-code`; only one small "Я родитель" link remains in the header; layout intact at mobile + desktop widths.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(access): landing reframe — child-first 'I have a code' primary action"
```

---

## Task 10: Env, docs, and the deterministic public-boundary guard

**Files:**
- Modify: `.env.example`, `tests/deterministic.mjs`, `docs/DEPLOY-CHECKLIST.md`

**Interfaces:**
- Consumes: `isPublicApiPath` from `@/lib/request-access`.

- [ ] **Step 1: Document new env**

Add to `.env.example`:
```bash
# Clerk Backend API (server-only) — mints child sign-in tickets for one-time access codes.
CLERK_SECRET_KEY=sk_test_...
# Absolute app origin, used to build parent activation links (/activate?t=...).
NEXT_PUBLIC_APP_URL=http://localhost:3000
# NOTE: CONSENT_CODE_PEPPER (already documented) now also peppers AccessCode hashes.
```

- [ ] **Step 2: Add a static guard that redeem/activate are public + no raw-code storage**

In `tests/deterministic.mjs`:
```js
{
  const { isPublicApiPath } = await import("../src/lib/request-access.ts");
  test("access redeem + activate are public API paths", () => {
    assert.ok(isPublicApiPath("/api/access-code/redeem"));
    assert.ok(isPublicApiPath("/api/access-code/activate"));
  });
  const codeSrc = readFileSync("src/lib/access-code.ts", "utf8");
  test("access-code.ts stores only hashes, never a raw code column", () => {
    assert.ok(codeSrc.includes("hashAccessValue"));
    assert.ok(!/data:\s*{[^}]*\bcode:\s/.test(codeSrc), "must not persist a raw `code` field");
  });
}
```

- [ ] **Step 3: Run the full deterministic gate + note the flow in the deploy checklist**

Run: `npm test`
Expected: PASS including the two new guards.
Then add a short "Solo access codes" subsection to `docs/DEPLOY-CHECKLIST.md`: requires `CLERK_SECRET_KEY` + `NEXT_PUBLIC_APP_URL` in prod; codes generated via `npm run gen:codes`; parent must open `/activate` once before a code works.

- [ ] **Step 4: Commit**

```bash
git add .env.example tests/deterministic.mjs docs/DEPLOY-CHECKLIST.md
git commit -m "feat(access): document access-code env + guard public boundary in tests"
```

---

## Task 11: End-to-end proof (Playwright, dev seam)

**Files:**
- Create: `tests/e2e-access-code.test.mjs`

**Interfaces:**
- Consumes: the running dev server; `createAccessCode` + `activateAccessCode` (to seed a code without the admin CLI), and the real `/enter-code` UI.

- [ ] **Step 1: Write the E2E that a seeded, activated code signs the child in**

Follow the existing `scripts/e2e/lesson-flow.mjs` harness conventions (Clerk-CORS interception, headless Chromium). The test:
1. Seeds a code via `createAccessCode("e2e@allow.test")`, then activates it via `activateAccessCode(token, { serviceConsent:true, externalAiConsent:true, clerkId: <from findOrCreateUserByEmail in a dev stub> })`. In dev, gate the Clerk-backend calls behind the same `x-test-bypass`/dev seam the repo already uses so no live Clerk instance is required; assert the redeem route returns `ok:true` with a ticket-shaped string.
2. Loads `/enter-code`, types the code, submits.
3. Asserts navigation to `/onboarding`.
4. Asserts re-redeeming the same code returns `ok:false` (single-use).

```js
// Skeleton — fill following scripts/e2e/lesson-flow.mjs (same launch + interception helpers):
import { chromium } from "playwright";
import { createAccessCode, activateAccessCode, redeemAccessCode } from "../src/lib/access-code.ts";
// 1) seed + activate a code (dev), 2) drive /enter-code, 3) expect /onboarding, 4) expect single-use.
```

- [ ] **Step 2: Run it**

Run: `node tests/e2e-access-code.test.mjs`
Expected: PASS — seeded+activated code drives the child from `/enter-code` to `/onboarding`; a second redeem of the same code fails.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e-access-code.test.mjs
git commit -m "test(access): E2E — activated one-time code signs the child into onboarding"
```

---

## Self-Review

**Spec coverage (access sections of the v2 spec):**
- §0/§2 consent posture B (parent activation screen, two opt-ins, `recordConsent`) → Tasks 5, 6. ✅
- §2 kid-friendly code: segmented, no ambiguous chars, paste, entered once → Tasks 2 (alphabet), 8 (UI). ✅
- §2 redemption: validate → find/create Clerk user → record consent → mint ticket → client ticket sign-in → onboarding → Tasks 3, 5, 7, 8. ✅
- §2 "safety architecture unchanged": redemption ends in `recordConsent`; gates untouched → Task 5. ✅
- §8 hashing/rate-limit/single-use/ticket-only-in-JSON → Tasks 2, 5, 7. ✅
- §9 landing reframe child-first → Task 9. ✅
- §8 admin issuance → Task 4. ✅
- §11 migration via `turso-db-push.mjs`, `@clerk/backend` direct dep → Tasks 1, 3. ✅
- **Deferred (other subsystems, NOT this plan):** guidance UI kit (§3), gamification/monster-evolution/wrong-answer (§4/§5), certificate+keepsake (§6). Roadmapped below.

**Placeholder scan:** the two `{/* opt-in label from consent/page.tsx */}` markers in Task 6 are intentional copy-verbatim instructions with a hard pre-commit note, not TBDs. Task 11's E2E is a skeleton keyed to the existing harness (the repo's E2E is environment-specific); its assertions are concrete. No other placeholders.

**Type consistency:** `hashAccessValue`, `normalizeCode`, `generateCode`, `createAccessCode`, `findActivationByToken`, `activateAccessCode`, `redeemAccessCode`, `findOrCreateUserByEmail`, `mintSignInTicket` are used with identical signatures across Tasks 2/3/4/5/7. `AccessCode` field names match the Task 1 schema. Route response shapes (`{ ok, ticket }`, `{ email }`) match their consumers in Tasks 6/8.

---

## Roadmap — the other three subsystems (plan each AFTER this ships)

1. **Guided runtime UI kit** (spec §3) — mascot voice+caption, pulsing "tap here" ring, step-gating wrapper, ≤3 modeless coachmarks, idle-nudge hook, big forgiving targets; wired across land → code → hatch → lesson.
2. **Gamification & wrong-answer pedagogy** (spec §4/§5) — progress-as-competence map, endowed head-start, monster evolution stages tied to skills, reserved celebration cadence, unlimited-retry progressive-hint wrong-answer UX, process-praise. **No streaks/hearts/loot.**
3. **Completion — certificate + monster keepsake** (spec §6) — auto-offer certificate (Code.org pattern), personalized (child + monster), PNG (`@vercel/og`) + PDF, monster final-form keepsake card, parent-gated sharing.

Each is an independent plan producing working, testable software on its own; build in this order (guidance makes the existing lessons usable solo; gamification deepens; certificate closes the loop).
