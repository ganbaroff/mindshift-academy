# MindShift Academy — Pass A фактический отчёт

Дата: 2026-07-17  
Revision: `fccf81a`  
Scope: Academy / учебная программа, auth-consent, API, safety, rewards, build/test infrastructure  
Mode: discovery only; исходный код не исправлялся

## Verdict

`NO-GO`.

Причины: обнаружен путь утечки детского текста во внешний AI до parental consent; UI не доводит allowlisted account без consent до рабочего учебного пути; lint красный; обязательный live safety suite не завершился за 180 секунд; полноценный 5-урочный E2E отсутствует.

## Commands and evidence

| Check | Result |
|---|---|
| `npm.cmd run build` | PASS, exit 0; Next 16.2.9 build/typecheck/static generation complete |
| `npm.cmd run lint` | FAIL, 65 errors / 20 warnings |
| `node scripts/test-consent.mjs` | PASS 9/9 |
| `npx tsx scripts/test-rewards.ts` | PASS 12/12; Prisma P2002 messages ожидаемы и обработаны |
| `node scripts/regression.mjs` | 21 pass, 0 fail, 1 blocked; benign L1 input blocked by llama-guard |
| anonymous page smoke | landing 200; protected pages redirect to `/sign-in`; `/no-access` 200 |
| anonymous API smoke | chat/monster/tts/gacha/consent = 401; reset in development = 200; cron POST = 405 |
| live `npm test` | не завершился за 180 s на provider lane; отдельный default run также ломается на localhost/IPv6 mismatch |

## Findings

### MSA-P0-PRIV-001 — silhouette egress до parental consent

**Severity:** P0  
**Status:** confirmed by code; end-to-end provider interception pending authenticated account fixture

`src/app/api/generate-silhouette/route.ts:83-148` проверяет только Clerk identity. Для signed-in пользователя без valid consent route вызывает `getAIClient()`, moderation и затем AI completion с `words.join(", ")`. В route нет `hasValidConsent()`.

Это нарушает заявленную модель COPPA: consent-gate уже присутствует в chat, monster и tts, но не в silhouette для authenticated user. Anonymous preview остаётся deterministic fallback, однако ручной/клиентский запрос после sign-in отправляет детский текст во внешний provider.

**Release condition:** до consent ни один child free-text не должен покидать приложение; добавить authenticated no-consent test с network spy и 403/детерминированным fallback без AI call.

### MSA-P1-FLOW-002 — consent не встроен в рабочий UI-путь

**Severity:** P1  
**Status:** confirmed by code; browser proof with Clerk fixture pending

- `src/app/lesson/layout.tsx` проверяет allowlist, но не `hasValidConsent()`.
- `src/app/onboarding/page.tsx:74-92` вызывает `/api/monster`, игнорирует non-2xx и всё равно переводит пользователя в `ready`.
- `src/app/lesson/[id]/page.tsx` открывается для allowlisted account без consent; chat API затем возвращает 403.

Результат: родитель, прошедший allowlist, но ещё не consent, видит onboarding/lesson, но не может закончить onboarding или учиться и не получает понятный redirect на `/consent`.

**Release condition:** автоматический flow `allowlisted + no consent → /consent`; onboarding не должен продолжаться после 403; lesson/chat не должны показывать сломанный рабочий экран.

### MSA-P1-QUALITY-003 — production lint gate красный

**Severity:** P1  
**Status:** confirmed

`npm.cmd run lint` завершился с 65 errors и 20 warnings. Основные группы: `no-explicit-any`, React `set-state-in-effect`, `getIntroductionText` accessed before declaration, JSX unescaped entities/comments, missing hook dependencies, unused suppressions и variables.

Build проходит, но релизный quality gate не может считаться зелёным, пока lint errors не исправлены или не обоснованы точечными suppressions.

### MSA-P1-TEST-004 — safety suite не является надёжным CI gate

**Severity:** P1  
**Status:** confirmed

Наблюдения:

1. `tests/safety.test.mjs` по умолчанию использует `http://localhost:3001`. В Windows harness Next слушал `127.0.0.1`; Node сначала пытался `::1` и получал `ECONNREFUSED`.
2. После явного `BASE_URL=http://127.0.0.1:3123` live suite выполнялась более 180 секунд и была остановлена по timeout; pass/fail summary не получен.
3. Тест делает последовательные live provider calls и не имеет общего AbortController/deadline.

Это означает, что `npm test` не воспроизводим как чистый CI gate и может зависать при provider degradation.

**Release condition:** test command сама поднимает server, нормализует host, имеет общий deadline, разделяет deterministic и live lanes, а blocked/timeout не считается pass.

### MSA-P1-SAFETY-005 — стабильная ложная блокировка benign L1 input

**Severity:** P1  
**Status:** confirmed by repeated regression runs

`node scripts/regression.mjs` оба запуска дали 21 pass / 0 fail / 1 blocked. Blocked case: L1 wrong/nonsense input блокирован `llama-guard` как benign nonsense, поэтому judge не проверяется. Для ребёнка это indistinguishable от невозможности пройти урок при безопасном вводе.

**Release condition:** false-positive dataset по RU/AZ/EN и повторный live test с измерением false-reject rate; в отчёте нельзя смешивать safety-block с pedagogical-wrong.

### MSA-P2-DEV-006 — unauthenticated development reset мутирует shared demo row

**Severity:** P2 in release, P1 if dev server reachable by untrusted network  
**Status:** confirmed by anonymous HTTP smoke

`POST /api/reset` без cookie вернул 200 и сбросил `username="Uchenik"` в development. Production guard возвращает 403 при `NODE_ENV !== development`, поэтому это не доказанный production bypass, но endpoint опасен для shared dev/staging environments и меняет общую БД без auth.

**Release condition:** bind reset to explicit test-only secret/user fixture or remove route from deployable build; add anonymous and production-mode tests.

### MSA-P2-CONFIG-007 — environment contract неполный

Код читает `GEMINI_API_KEY`, `RESEND_FROM`, `CONSENT_CODE_PEPPER`, но `.env.example` их не описывает. Это создаёт silent fallback: provider может уйти на другой AI, email — на `onboarding@resend.dev`, а consent codes — без pepper.

**Release condition:** `.env.example`, deploy checklist, startup validation и CI secret contract должны совпадать с фактическими `process.env` references.

### MSA-P2-NEXT-008 — deprecated middleware convention

`npm run build` предупреждает: `middleware` file convention deprecated, использовать `proxy`. Это не текущий runtime failure, но migration debt касается auth boundary и должен иметь отдельный upgrade task до следующего Next update.

### MSA-P2-E2E-009 — нет доказательства полного учебного цикла

`scripts/e2e/lesson-flow.mjs` проверяет только L1 и L2, требует dev `x-test-bypass`, не покрывает consent, Clerk, L3–L5, dashboard, revoke и cross-device. Regression suite в основном pure seams + provider calls, не браузерный пользовательский путь.

**Release condition:** Playwright Chromium/Firefox/WebKit full flow с реальным test Clerk account и отдельный deterministic mocked provider lane.

## Confirmed passes

- Consent resolver: missing, valid, revoked, stale version, partial opt-ins, resolver error, wrong/right/replay code — 9/9.
- Rewards: first award, distinct event replay, same event replay, lesson 5, legitimate sequential lessons — 12/12.
- Regression state ownership: replay modal, server progress reconciliation, backward navigation, persona-for-viewed, curriculum reward map — green.
- Production build and TypeScript compilation — green.
- Anonymous protected-page redirects — green for tested pages.
- Anonymous auth gates on chat/monster/tts/gacha/consent — 401.

## Not tested / blocked

- Real Clerk sign-in with two separate families.
- Authenticated no-consent silhouette interception.
- Full 5-lesson browser loop and dashboard totals.
- Firefox/WebKit/mobile/a11y/performance/load.
- Provider fault injection for each Gemini/NVIDIA/Turso/Upstash/Resend boundary.
- Production deployment with real Turso/Redis/Cron/Resend secrets.
- Legal human approval of COPPA/GDPR-K/DPA/privacy copy.

## Immediate next execution order

1. P0 privacy test and gate for silhouette.
2. Consent-aware onboarding/lesson redirect test.
3. Make test runner deterministic and bounded; separate live provider lane.
4. Fix lint/type quality gate.
5. Run authenticated full browser loop across all 5 lessons.
6. Repeat safety dataset and false-positive measurement.
7. Only after those pass, run accessibility/performance/load and production canary.

