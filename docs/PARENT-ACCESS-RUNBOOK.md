# Parent access runbook

## Purpose

MindShift Academy is a closed, parent-gated programme. A parent can self-register in Clerk, but
they reach the Academy only after their email has an explicit operator grant. This is deliberate:
child access is never opened by an unknown self-sign-up.

## Inbound requests (site form → operator)

Families with no invite use `/request-access` (linked from the home page and from `/no-access`).
The form stores the ADULT's email, an optional name, and an optional short note — nothing about a
child — and grants nothing on its own.

- Alert: with `TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID` set in production, each new request
  is pushed to that chat/channel. Unset = the feature is silently off and the request is still
  stored. Wiring: create a bot with @BotFather, add it to the channel as admin, then read the
  channel's numeric id (`-100…`) from `https://api.telegram.org/bot<token>/getUpdates` after
  posting once in the channel.
- Inbox: `node scripts/list-access-requests.mjs` (add `--all` to include decided rows).
- Repeat submissions of the same address are ignored; the honeypot field drops form-spam bots.
- Rate limit: 5 submissions per hour per client IP, fail-closed when the distributed limiter is
  missing in production.

## Approve one request

```powershell
node scripts/approve-access-request.mjs parent@example.com                # names only, marks approved
node scripts/approve-access-request.mjs parent@example.com --grant        # + vercel env add
node scripts/approve-access-request.mjs parent@example.com --issue-code   # + one-time code & link
```

`--grant` changes production configuration and `--issue-code` writes to the live database, so both
stay behind explicit flags. A Vercel variable applies only to the NEXT production deployment.

## Normal operation: add one parent

When the owner supplies a parent's email, use this exact sequence from the Academy repository.
Do not retrieve, copy, or replace `ALLOWLIST_EMAILS`; existing grants must remain untouched.

1. Normalise the adult's email: trim whitespace and use lowercase.
2. Derive the variable name locally (this prints no secret value):

   ```powershell
   node -e "const {createHash}=require('node:crypto'); console.log('ACADEMY_ALLOW_EMAIL_'+createHash('sha256').update(process.argv[1].trim().toLowerCase()).digest('hex').toUpperCase())" "parent@example.com"
   ```

3. Add that **new** production variable with value `1`:

   ```powershell
   vercel env add ACADEMY_ALLOW_EMAIL_<DIGEST_FROM_STEP_2> production --value 1 --sensitive --yes
   ```

4. Create a new production deployment. Environment-variable changes apply to newly built
   deployments, not the currently live one.
5. Ask the parent to open [academy.volaura.app](https://academy.volaura.app), choose
   **«Я родитель»**, sign up/sign in with that exact email, and complete the parent-consent flow.
   They should then reach `/consent`, not `/no-access`.

The variable name has a deterministic SHA-256 digest instead of raw email to reduce accidental
email exposure in Vercel's variable-name list. It is not a secret, password, or encryption.

## Revoke one parent

Remove only that parent’s `ACADEMY_ALLOW_EMAIL_<DIGEST>` production variable in Vercel, then deploy
again. Revocation blocks the Academy path on the next request. If the parent already granted
consent, also use the dashboard's **«Отозвать согласие»** control, which blocks child-data APIs
immediately and records the consent revocation.

## Legacy compatibility and safety

- `ALLOWLIST_EMAILS` remains active for already configured parents; do not migrate it casually.
- Production fails closed if it has neither a non-empty legacy list nor an active additive grant.
- Development remains open only when neither kind of grant is configured, matching the prior
  local-development behaviour.
- The parent email belongs to the adult Clerk account. Do not use a child's email or child name
  as the access identifier.

## Planned: operator panel at `/admin` (2026-08-04, NOT BUILT YET)

Everything above is CLI-only, so the owner cannot approve a family from a phone and has nowhere to
put an address a parent sent him privately. The fix, in order — do not skip step 1, the button is
impossible without it:

1. **Move the allowlist out of environment variables into the database.** This is the real blocker:
   `ACADEMY_ALLOW_EMAIL_<digest>` only takes effect on the NEXT deployment, so no web button can
   grant access today. Add an additive migration `0004_operator_grants` with a `ParentGrant` model
   (`emailHash` unique = the same sha256 used by the env keys, `email`, `grantedBy` = operator Clerk
   id, `createdAt`, `revokedAt`, `note`). Then `isParentEmailAllowed` (`src/lib/parent-allowlist.js`)
   checks, in order: live `ParentGrant` → existing `ACADEMY_ALLOW_EMAIL_*` → legacy
   `ALLOWLIST_EMAILS`. The three families already granted by env keep working untouched, and
   production stays fail-closed.
2. **Define the operator.** New `OPERATOR_CLERK_IDS` (comma-separated) production variable;
   `isOperator()` returns false when it is unset in production. Clerk ids, not emails — a user can
   edit their own email, not their id.
3. **Build `/admin`,** server-rendered, operator-gated, mobile-first:
   - *Заявки* — every `AccessRequest` with **Одобрить** / **Отклонить**. Approve does all four
     existing steps in one action: create the `ParentGrant`, issue the code (`src/lib/access-code.ts`),
     send the invite (`src/lib/family-invite-email.ts`), mark the request approved.
   - *Семьи* — per family: code status (issued / active / redeemed), invite delivery, whether the
     child ever signed in, last session, lessons finished.
   - *Добавить вручную* — one email field, for parents who wrote to the owner directly instead of
     using the form. This replaces "send the address to the agent".
   - *Действия* — resend invite, re-issue code, revoke.
   API under `/api/admin/*`: operator-gated, rate-limited, every action writes an audit row.
4. **Only after step 3 works:** an inline **Одобрить** button on the Telegram alert, hitting
   `/api/admin/approve` with a signed one-time token, so the whole flow is one tap from the phone
   notification.

Guardrails: real parent emails become visible on a web page, so that route is operator-gated, never
indexed and carries no analytics; approving mutates production data, so every action is attributed;
and the CLI scripts above stay as the fallback when the panel is broken.
