# Task 2 brief — RU-only privacy copy, parent email and accessibility

Work in `C:\Projects\mindshift-academy` on the existing dirty release candidate. Do not commit, push, deploy, or change provider/DNS configuration. Preserve unrelated user changes. Read `AGENTS.md`, relevant project skills (`mindshift-framer`; `tailwind-v4` if styling is touched), and the Next 16 docs required by AGENTS.md before editing Next code.

Implement Task 2 from `docs/superpowers/plans/2026-07-22-academy-production-release.md` using strict TDD. First create `tests/release-copy.test.mjs`, run it and record RED. Then make the smallest scoped changes and record GREEN.

Decision: this release is Russian-only. Remove/hide all public RU/AZ language toggles and Azerbaijani UI copy in the in-scope Academy screens; do not build a new localization system.

Required facts and copy:

- Consent and activation must state in clear Russian that NVIDIA performs the initial safety check, Google Gemini powers the tutor and/or checks the task, and OpenAI may create the pet image. State that the data is used only for course functionality.
- Dashboard must not promise viewing stored child messages; it may promise viewing progress and deletion of Academy data.
- Weekly parent email must be fully Russian, neutral, and must not contain `Salam`, `Valideyn`, or emotionally coercive pet-missing language.
- User-facing `Safe Proxy`/`Safe API Proxy` becomes `Защита включена` or a clear Russian equivalent.
- Explain IF/THEN as `ЕСЛИ/ТО` in Russian and remove claims about model-weight calibration.

Accessibility requirements:

- Async consent notice: `role="status" aria-live="polite"`.
- Inputs: `name="parentEmail"` and `name="verificationCode"`.
- Two independent consent checkboxes must be grouped with a visible `legend`.
- Progress bar must use width-only transition; no `transition-all`.

Likely files (change only those actually needed):

- `tests/release-copy.test.mjs`
- `src/app/page.tsx`
- `src/app/consent/page.tsx`
- `src/app/activate/page.tsx`
- `src/app/dashboard/page.tsx`
- `src/app/lesson/[id]/page.tsx`
- `src/components/chat/PromptInput.tsx`
- `src/components/layout/Header.tsx`
- `src/emails/weekly-report.tsx`
- `package.json` only if a test script is justified

Verification:

1. `node tests/release-copy.test.mjs`
2. `npm run test:ui`
3. `npm test`
4. `npm run lint`
5. `git diff --check -- <all Task 2 files>`

Write a concise report to `.superpowers/sdd/task-2-report.md` with changed files, RED evidence, GREEN evidence, and concerns. Return `DONE` only if all scoped checks pass. If an existing unrelated failure blocks a command, identify it precisely rather than masking it.
