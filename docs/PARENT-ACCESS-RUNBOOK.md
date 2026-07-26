# Parent access runbook

## Purpose

MindShift Academy is a closed, parent-gated programme. A parent can self-register in Clerk, but
they reach the Academy only after their email has an explicit operator grant. This is deliberate:
child access is never opened by an unknown self-sign-up.

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
