# MindShift Academy Production Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Выпустить проверенную RU-only версию MindShift Academy, пригодную для передачи ссылки родителям.

**Architecture:** Сначала закрываются локальные supply-chain, privacy-copy и accessibility контракты. Затем отдельно настраиваются Cloudflare DNS, Clerk production, Resend sender и Vercel environment; только после готовности провайдеров выполняются production deploy и реальный canary.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk, Prisma 7 + Turso/libSQL, Resend, Upstash, Vercel, Cloudflare DNS, Node test scripts, Playwright.

## Global Constraints

- Релизная поверхность только на русском языке; AZ-переключатели скрыты до полной локализации всего пути.
- Clerk принадлежит родителю; детские данные связаны с Clerk ID родителя в Turso.
- Ни один секрет или verification code не печатается в logs, документации или ответе пользователю.
- Consent перечисляет реально используемые NVIDIA, Google Gemini и OpenAI и назначение каждой обработки.
- `.env`, `.env.*`, `.clerk/` и локальные SQLite-файлы не входят в Vercel source bundle; `.env.example` остаётся доступен.
- Production release требует `npm audit --omit=dev --audit-level=high` с нулём уязвимостей и полный `npm run verify:release` exit 0.
- Коммиты и push не выполняются; все существующие пользовательские изменения сохраняются.

---

### Task 1: Supply-chain и Vercel packaging

**Files:**
- Create: `.vercelignore`
- Create: `tests/release-packaging.test.mjs`
- Modify: `package.json`
- Modify mechanically: `package-lock.json`

**Interfaces:**
- Consumes: существующие npm scripts и production-env contract.
- Produces: `npm run test:packaging`; дерево зависимостей без известных high/moderate advisories; source bundle без локальных secrets.

- [ ] **Step 1: Write the failing packaging test**

Создать Node test, который читает `.vercelignore` и `package.json`, затем проверяет наличие правил `.env`, `.env.*`, `!.env.example`, `.clerk/`, `*.db`, а также версии `next=16.2.11`, `prisma=7.9.0`, `@prisma/client=7.9.0` и overrides `sharp=0.35.3`, `fast-uri=3.1.4`.

- [ ] **Step 2: Verify RED**

Run: `node tests/release-packaging.test.mjs`  
Expected: FAIL, потому что `.vercelignore` отсутствует и package versions устарели.

- [ ] **Step 3: Implement the minimal packaging fix**

Добавить `.vercelignore`:

```gitignore
.env
.env.*
!.env.example
.clerk/
*.db
dev.db
prisma/dev.db
```

Обновить `next`/`eslint-config-next` до `16.2.11`, `prisma`/`@prisma/client` до `7.9.0`; закрепить `sharp: 0.35.3` и `fast-uri: 3.1.4` через `overrides`. Обновить lockfile командой `npm install --package-lock-only`, затем установить дерево `npm install`.

- [ ] **Step 4: Verify GREEN and security**

Run: `node tests/release-packaging.test.mjs`  
Expected: PASS.

Run: `npm audit --omit=dev --audit-level=high`  
Expected: `found 0 vulnerabilities`.

Run: `npm run build`  
Expected: exit 0 with Next.js 16.2.11 and Prisma 7.9.0.

---

### Task 2: RU-only privacy copy, parent email и accessibility

**Files:**
- Create: `tests/release-copy.test.mjs`
- Modify: `src/app/page.tsx`
- Modify: `src/app/consent/page.tsx`
- Modify: `src/app/activate/page.tsx`
- Modify: `src/app/dashboard/page.tsx`
- Modify: `src/app/lesson/[id]/page.tsx`
- Modify: `src/components/chat/PromptInput.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/emails/weekly-report.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: фактический provider routing из `src/lib/ai-provider.ts` и monster route.
- Produces: единая русская release-copy, информированное provider consent, нейтральный parent report и статический regression gate.

- [ ] **Step 1: Write the failing copy test**

Тест должен доказать: на landing/consent отсутствует AZ toggle; consent и activation называют `NVIDIA`, `Google Gemini`, `OpenAI`; weekly email не содержит `Salam`, `Valideyn` или фразы о скучающем питомце; consent notice имеет `aria-live`; email/code inputs имеют `name`; progress bar не содержит `transition-all`; пользовательские экраны не показывают `Safe Proxy`/`Safe API Proxy`.

- [ ] **Step 2: Verify RED**

Run: `node tests/release-copy.test.mjs`  
Expected: FAIL на текущей mixed-language и NVIDIA-only copy.

- [ ] **Step 3: Implement factual RU-only copy**

Убрать публичные RU/AZ переключатели и оставить русскую copy. В consent указать: NVIDIA выполняет первичную safety-проверку, Google Gemini отвечает за тьютора/проверку задания, OpenAI может создавать изображение питомца; данные используются только для функций курса. Продублировать тот же смысл в activation consent.

- [ ] **Step 4: Remove misleading/coercive copy**

Заменить обещание просмотра сохранённых сообщений на просмотр прогресса и удаление Academy-данных. Сделать weekly email полностью русским и нейтральным. Заменить `Safe Proxy` на `Защита включена`; объяснить IF/THEN русским `ЕСЛИ/ТО`; убрать утверждение о «калибровке весов модели».

- [ ] **Step 5: Apply accessibility fixes**

Добавить `role="status" aria-live="polite"` для async consent notice, `name="parentEmail"` и `name="verificationCode"`, видимый `legend` для двух независимых consent checkbox, заменить `transition-all` на `transition-[width]`.

- [ ] **Step 6: Verify GREEN**

Run: `node tests/release-copy.test.mjs && npm run test:ui && npm test && npm run lint`  
Expected: все команды exit 0, lint без warnings.

---

### Task 3: Cloudflare, Clerk, Resend и Vercel production

**Files:**
- Modify externally: Cloudflare DNS zone `volaura.app`
- Modify externally: Clerk production instance `ins_3GGdwsYOiPshSOqG1oee5k0mP1y`
- Modify externally: Resend domain `volaura.app`
- Modify externally: Vercel project `mindshift-academy` production environment

**Interfaces:**
- Consumes: five CNAME records from `clerk deploy status`, three Resend DNS records from Resend API, existing live Clerk keys.
- Produces: verified Clerk DNS/SSL/mail, verified Resend sender, live Vercel Clerk keys and `RESEND_FROM=MindShift Academy <noreply@volaura.app>`.

- [ ] **Step 1: Add Clerk DNS records in Cloudflare**

Создать DNS-only CNAME records:

```text
clerk -> frontend-api.clerk.services
accounts -> accounts.clerk.services
clkmail -> mail.udkngym53pxc.clerk.services
clk._domainkey -> dkim1.udkngym53pxc.clerk.services
clk2._domainkey -> dkim2.udkngym53pxc.clerk.services
```

- [ ] **Step 2: Add Resend DNS records**

Получить актуальные records через Resend API, создать их в Cloudflare как DNS-only с точными name/value/priority, затем инициировать domain verification.

- [ ] **Step 3: Wait on authoritative provider status**

Run: `clerk deploy status --mode agent --wait` with bounded waits.  
Expected: DNS, SSL and mail complete.

Query Resend domain status without logging the API key.  
Expected: `verified`.

- [ ] **Step 4: Switch Vercel to live provider configuration**

Получить production Clerk keys напрямую для указанного app/instance во временный файл вне repo; обновить Vercel `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` и `CLERK_SECRET_KEY` без печати значений. Задать `NEXT_PUBLIC_CLERK_JS_URL=https://clerk.volaura.app/npm/@clerk/clerk-js@6/dist/clerk.browser.js` и `RESEND_FROM` точным значением `MindShift Academy <noreply@volaura.app>`. Удалить временный файл сразу после обновления.

- [ ] **Step 5: Run provider preflight**

Run: `vercel env run -e production -- npm run check:prod-env` from a Windows-safe command shell.  
Expected: `PRODUCTION ENV PRECHECK PASSED`.

---

### Task 4: Release verification, deployment и canary

**Files:**
- Modify: `docs/DEPLOY-CHECKLIST.md`
- Modify: `docs/HANDOVER-2026-07-18.md`
- Modify: `docs/RELEASE-AUDIT-CONTINUATION-2026-07-18.md`
- Deploy externally: Vercel production project `mindshift-academy`

**Interfaces:**
- Consumes: Tasks 1–3 completed with green evidence.
- Produces: reproducible Vercel deployment, parent-safe public URL and final GO/NO-GO record.

- [ ] **Step 1: Run the full local gate**

Run: `npm run verify:release`  
Expected: exit 0; audit 0; lint/build/typecheck; consent/lifecycle/auth/safety; Chromium/Firefox/WebKit L1–L5.

- [ ] **Step 2: Inspect source manifest and deploy**

Проверить Vercel upload manifest/dry-run доступной CLI и подтвердить отсутствие `.env`/`.clerk`/DB. Выполнить `vercel --prod --yes`, дождаться `Ready`, затем проверить build log на отсутствие `Detected .env file`.

- [ ] **Step 3: Production anonymous and public canary**

Проверить `/` и `/sign-in` = 200, protected API anonymous = 401, deterministic silhouette = 200, повторные запросы достигают 429, console не содержит development Clerk warning, live HTML содержит `pk_live_` и не содержит `pk_test_`.

- [ ] **Step 4: Production parent flow**

Использовать отдельную родительскую Clerk-сессию: sign-in, consent email, retrieval verification code через Resend delivery record, два opt-in, onboarding, урок 1, revoke, немедленная блокировка child path, permanent Academy-data delete. Не удалять существующий Clerk account владельца.

- [ ] **Step 5: Update release evidence**

Зафиксировать точный deployment ID/URL, timestamps, gate counts, provider statuses и оставшийся human legal-review note без утверждения, что инженерная проверка является юридическим заключением.
