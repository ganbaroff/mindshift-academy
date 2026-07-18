# MindShift Academy — план полного релизного аудита

> **Для модели-исполнителя:** выполнять проверки последовательно, не исправлять код во время первого прохода. Каждый дефект подтверждать воспроизводимым тестом, логом, HTTP-ответом, записью БД или скриншотом. После первого прохода передать отчёт SOL-аудитору для приоритизации исправлений.

**Цель:** доказать, что программа обучения MindShift Academy безопасно и стабильно проводит отдельного ребёнка через согласие родителя, создание питомца, пять уроков, выдачу наград и родительский dashboard.

**Область:** только `C:\Projects\mindshift-academy` и относящиеся к Academy материалы в родительской папке `mindshift`. Маркетинговая воронка, Telegram и отдельный Supabase-проект не входят в аудит, кроме проверки ссылок/контрактов интеграции.

**Стек:** Next.js 16.2.9, React 19.2.4, Clerk 7, Prisma 7, Turso/libSQL, Gemini tutor/judge/kidNet, NVIDIA llama-guard, Upstash, Resend, Playwright.

## 1. Текущий проверенный baseline

Состояние на 2026-07-17:

- `npm run build` — проходит; Next.js предупреждает, что `middleware.ts` deprecated и должен стать `proxy.ts`.
- `npm run lint` — не проходит: 65 errors, 20 warnings.
- `npm test` — не самодостаточен; без заранее запущенного приложения на `localhost:3001` падает с `ECONNREFUSED`.
- `node scripts/test-consent.mjs` — 9/9 pass.
- `npx tsx scripts/test-rewards.ts` — 12/12 pass.
- `node scripts/regression.mjs` — 21 pass, 0 fail, 1 blocked: llama-guard блокирует безобидный nonsense-ввод урока 1.
- `scripts/e2e/lesson-flow.mjs` проверяет только уроки 1–2, использует dev bypass и не является полным пользовательским E2E.
- Рабочее дерево не чистое; существующие изменения пользователя не трогать и не смешивать с исправлениями.

Эти результаты — стартовые данные, а не разрешение на релиз.

## 2. Решение о релизе

Релиз получает `GO` только при одновременном выполнении условий:

1. Все P0 и P1 закрыты подтверждёнными повторными тестами.
2. `npm run lint`, `npm run build` и единая CI-команда тестов завершаются кодом 0 в чистом checkout.
3. Полный браузерный путь родитель → согласие → ребёнок → 5 уроков → dashboard проходит минимум в Chromium, Firefox и WebKit.
4. Ни один API пользователя не доступен без Clerk-сессии; данные одного аккаунта недоступны другому.
5. Без действующего parental consent ни один детский текст/голос/описание не уходит внешнему AI-провайдеру.
6. Все 5 правильных ответов стабильно принимаются, все контрольные неправильные ответы не награждаются, unsafe-ввод и unsafe-вывод блокируются fail-closed.
7. Повтор, double-click, parallel request и refresh не дают повторную награду и не ломают прогресс.
8. Нет утечки секретов, PII или текста ребёнка в логах, БД, analytics, error payload и скриншотах.
9. P95 интерактивного ответа укладывается в согласованный бюджет, а отказ AI/DB/Redis/Resend даёт безопасное и понятное состояние.
10. Юридические тексты и фактические data flows согласованы человеком, ответственным за COPPA/GDPR-K/локальное право.

Любой P0 означает `NO-GO`. Незакрытый P1 требует отдельного письменного принятия риска владельцем продукта.

## 3. Формат дефекта

Каждую ошибку регистрировать так:

```text
ID: MSA-AREA-NNN
Severity: P0 | P1 | P2 | P3
Title: одно проверяемое утверждение
Environment: commit, branch, OS, browser, viewport, NODE_ENV, DB/provider
Preconditions: пользователь, consent, activeStep, данные БД
Steps: точная нумерованная последовательность
Expected: наблюдаемое ожидаемое поведение
Actual: наблюдаемое фактическое поведение
Evidence: screenshot/video/log/HTTP/DB query/test path
Frequency: N/N
User impact: ребёнок / родитель / безопасность / деньги / данные
Suspected area: файл и строка, без неподтверждённого диагноза
Isolation: воспроизводится ли отдельно и после reset
Regression test proposal: точное имя теста и assertion
```

Severity:

- P0: риск ребёнку/данным, обход auth/consent, потеря/смешение данных, бесконечная награда, полный недоступный учебный цикл.
- P1: неверное обучение/оценка, сломанный обязательный путь, систематическая ложная блокировка, неработающий recovery.
- P2: существенный UX/a11y/performance дефект с обходным путём.
- P3: визуальная, текстовая или редкая косметическая проблема.

## 4. Подготовка воспроизводимой среды

1. Зафиксировать `git rev-parse HEAD`, `git status --short`, версии Node/npm и OS.
2. Создать отдельную тестовую БД; не использовать production Turso и текущий `dev.db` как единственный источник.
3. Создать минимум четыре Clerk-аккаунта: parent-valid, parent-no-consent, parent-revoked, second-family.
4. Завести контролируемые провайдерные ключи/лимиты и отдельные тестовые email inboxes.
5. Проверить `.env.example` против фактически читаемых `process.env.*`; значения секретов не выводить.
6. Поднимать приложение самим test runner на свободном порту и гарантированно завершать процесс после тестов.
7. Для каждого сценария сбрасывать только тестового пользователя и проверять post-condition в БД.
8. Запретить dev-only bypass при `NODE_ENV=production`; отдельным тестом доказать, что заголовок `x-test-bypass` игнорируется.

## 5. Статические и сборочные проверки

### 5.1 Quality gates

- Запустить `npm ci`, `npm run lint`, `npx tsc --noEmit`, `npm run build` в чистом checkout.
- Устранить 65 lint errors; не ослаблять правила глобальным disable.
- Зафиксировать Next 16 deprecation `middleware` → `proxy` как минимум P1 до следующего major update.
- Проверить отсутствие `any`, `@ts-ignore`, неиспользуемых suppressions, unreachable/dead code и test scripts, читающих `.env` небезопасно.
- Проверить, что generated Prisma client и schema синхронны с SQLite и Turso.

### 5.2 Dependency/security gates

- Выполнить lockfile audit, сверить прямые зависимости и лицензии.
- Проверить только официальные migration guides для Next 16, Clerk 7, Prisma 7 и React 19.
- Проверить CSP, security headers, cookie attributes, CORS и отсутствие source maps/секретов в client bundle.
- Поискать секреты и PII в git history, `.next`, логах и fixtures без вывода найденных значений в отчёт.

## 6. Матрица API

Для каждого из 14 маршрутов проверить: допустимые методы, 401, 403, 400/schema validation, 404, 409/idempotency, 429, 500/fail-closed, content-type, cache headers, timeout и отсутствие лишних полей.

Маршруты:

- `/api/chat`
- `/api/checkout`
- `/api/consent/request-code`
- `/api/consent/verify`
- `/api/consent/status`
- `/api/consent/revoke`
- `/api/cron/mood-decay`
- `/api/cron/weekly-report`
- `/api/gacha/claim`
- `/api/generate-silhouette`
- `/api/monster`
- `/api/reset`
- `/api/tts`
- `/api/user`

Обязательные негативные проверки:

- anonymous request ко всем private endpoints;
- authenticated, но не allowlisted;
- allowlisted без consent, с partial consent, expired version и revoked consent;
- account A пытается читать/менять данные account B;
- пустой, oversized, malformed JSON, wrong content-type, Unicode/control chars;
- повторный eventId и разные eventId для одного шага;
- 20–100 параллельных запросов;
- отсутствующий/неверный `CRON_SECRET`;
- отсутствующие Redis/AI/DB/email env в production;
- `x-test-bypass: true` в production;
- GET к mutation route и POST к read-only route.

## 7. Auth, allowlist, parental consent и privacy

1. Проверить sign-up/sign-in/sign-out/session expiry/cookie refresh и прямой переход на защищённые страницы.
2. Доказать, что родительский Clerk ID владеет ровно своим `User`, `Monster`, `LessonProgress`, `Inventory`, consent.
3. Проверить одновременную первую авторизацию: не создаются дубликаты, чужая anonymous row не присваивается.
4. Consent code: TTL 15 минут, максимум 5 попыток, single-use, resend инвалидирует старый код, rate limit переживает multi-instance deploy.
5. Проверить нормализацию email, смену primary email, отсутствие account enumeration.
6. Проверить два независимых opt-in, текущую `CONSENT_VERSION`, revoke и немедленное закрытие всех AI/data endpoints.
7. Во время blocked consent поставить network interceptor: внешних вызовов Gemini/NVIDIA/OpenAI/Resend быть не должно, кроме явно разрешённого consent email.
8. Проверить deletion/export/retention сценарии и cascade delete. Отсутствующие пользовательские механизмы оформить как gaps.
9. Убедиться, что raw child prompt не сохраняется; проверить `Monster.promptUsed`, server logs, Vercel logs, email и error tracing.
10. Юрист/ответственный человек отдельно сверяет COPPA consent method, privacy notice, subprocessors, DPA и возрастную модель. Автотест не заменяет legal sign-off.

## 8. Полный учебный E2E

Расширить Playwright до реального пути без dev bypass:

1. Landing и переход к регистрации.
2. Parent sign-up/sign-in.
3. Неallowlisted → `/no-access`.
4. Allowlisted, no consent → `/consent`.
5. Request code → wrong code → correct code → оба opt-in → consent valid.
6. Onboarding: имя, emoji/skin/color, подтверждение; данные совпадают в UI, `/api/user` и БД.
7. Уроки 1–5 подряд с проверкой intro, задания, tutor reply, judge verdict, modal, XP, crystals, activeStep и LessonProgress.
8. После каждого урока refresh и повторный вход с другого browser context: прогресс не теряется и не откатывается.
9. Прямой URL будущего урока закрыт; прошлый урок открыт, но повтор не награждается.
10. После урока 5 финальное состояние и dashboard отображают точные totals и историю.
11. Revoke consent из dashboard; следующий chat/tts/monster запрос получает 403 и не вызывает внешний AI.

Запускать матрицу:

- Chromium, Firefox, WebKit;
- desktop 1366×768, iPhone SE/современный iPhone, iPad portrait/landscape;
- touch + keyboard only;
- normal и `prefers-reduced-motion: reduce`;
- slow 3G/high latency, offline/reconnect;
- RU и AZ контент там, где продукт заявляет локализацию.

## 9. Проверка педагогики и LLM

Для каждого урока создать versioned dataset минимум из:

- 30 явно правильных формулировок;
- 30 явно неправильных/бессмысленных;
- 20 пограничных/частично правильных;
- 20 возрастных вариантов с опечатками, транслитом, emoji и RU/AZ code-switch;
- 20 adversarial/injection/safety примеров.

Каждый пример прогнать минимум 10 раз при фиксированных настройках. Считать отдельно false reject, false accept, unsafe pass, latency и provider error. Нельзя смешивать `blocked by safety` с `wrong by pedagogy`.

Уроковые инварианты:

- L1 принимает три осмысленных разных качества, не принимает три случайных слова.
- L2 принимает инструкцию о стиле речи, не просто позитивное слово.
- L3 принимает конкретное правило преобразования, не одиночный `*`.
- L4 принимает акт исправления ошибки, не голое название объекта.
- L5 принимает осмысленное условие, не фразу с ключевыми словами без логики.

Дополнительно:

- tutor persona соответствует просматриваемому уроку, а не `activeStep`;
- judge не видит лишнюю PII и не меняет server state напрямую;
- timeout/retry не порождает двойной tutor reply или reward;
- JSON verdict строго валидируется Zod и fail-closed при malformed output;
- fallback не превращает keyword matching в скрытый путь выдачи награды;
- проверить prompt injection через user text, monster name, skin и chat history.

## 10. Child safety red-team

Проверить input и output отдельно на RU, AZ и EN:

- сексуальный контент, grooming, self-harm, suicide, violence, weapons, drugs;
- bullying, hate, profanity, personal data solicitation, off-platform contact;
- jailbreak, role-play override, encoded/base64/spacing/homoglyph attacks;
- benign false positives: имена, география, учебные термины, опечатки;
- unsafe provider output, несмотря на безопасный input;
- classifier timeout, 429, 500, invalid JSON и частичный ответ.

Pass criteria: unsafe не попадает ребёнку и не награждается; outage закрывает путь безопасно; UI не стыдит ребёнка; лог не содержит raw prompt. Текущий false block L1 из regression — обязательный regression case.

## 11. Состояние, награды и экономика

- Проверить точные суммы по урокам: XP `100/150/200/250/500`, crystals `10/15/20/30/100`.
- Один шаг награждается ровно один раз при double-click, retry, refresh, two tabs, two devices и 50 concurrent requests.
- Один eventId на разные user/step не может повредить чужой прогресс.
- Gacha claim: граница суток и timezone Asia/Baku, DST/UTC, повтор, отрицательный баланс, parallel claim.
- Mood/streak: пропуск суток, clock skew, cron повтор, idempotency и отсутствие наказующего текста.
- Reset route недоступен production-пользователю и не может затронуть другой аккаунт.
- Проверить арифметические overflow/negative values и прямую подмену client payload.

## 12. Надёжность интеграций

Fault injection по отдельности:

- Gemini down/timeout/429/malformed output;
- NVIDIA llama-guard down/timeout/false positive;
- Turso read/write timeout и transaction conflict;
- Upstash absent/down;
- Clerk slow/down/session expired;
- Resend down/bounce/duplicate;
- TTS provider down или oversized response.

Для каждого случая зафиксировать timeout budget, retry policy, idempotency, UI recovery и отсутствие каскадных повторов. Не выполнять автоматический fail-open для safety, consent, auth или rate limiting в production.

## 13. Accessibility, UX и визуальная регрессия

- axe/WCAG 2.2 AA плюс ручная клавиатура и screen reader.
- Focus order/visible focus, skip links, headings, landmarks, labels, live regions, dialog focus trap/restore.
- Контраст текста, placeholder, disabled и focus states; отсутствие красного в error semantics согласно Academy rules.
- Touch target минимум 44×44; zoom 200/400%; reflow 320 px; safe areas.
- Все transition ≤800 ms, без screen shake и infinite action animation; reduced motion отключает confetti/parallax.
- Ровно один primary CTA и shame-free детский текст на ключевых экранах.
- Не должно быть выдуманных функций/картинок в tutor copy.
- Screenshot baselines для всех страниц, модалей, loading/empty/error/locked/success states.
- Проверить аудио mute, autoplay policy, captions/текстовый эквивалент и отсутствие резкого звука.

## 14. Performance и нагрузка

- Lighthouse/Web Vitals на landing, consent, onboarding, lesson и dashboard.
- Бюджет до согласования владельцем: LCP ≤2.5 s, INP ≤200 ms, CLS ≤0.1 на p75; API non-AI p95 ≤500 ms; AI first useful response p95 ≤10 s.
- Измерить JS bundle, image/audio/lottie size, cold start, DB query count и hydration warnings.
- Нагрузка: 10/50/100 одновременных учащихся; отдельно chat, consent code, reward и dashboard.
- Soak 60 минут: memory/connection leaks, runaway retries, provider cost и rate-limit fairness.

## 15. Email, cron и dashboard

- Weekly report авторизован только корректным secret, идемпотентен и не отправляется дважды.
- Проверить адресата account A/B, RU/AZ текст, escaping child content и отсутствие лишней PII.
- Mood cron не обрабатывает пользователя дважды и устойчив к partial failure.
- Dashboard totals соответствуют БД после каждого урока и на другом устройстве.
- Consent management корректно показывает valid/stale/revoked и не раскрывает verification material.

## 16. CI и обязательный regression pack

Собрать одну команду, которая сама поднимает тестовое приложение и выполняет:

1. lint + typecheck + build;
2. unit: curriculum/progression/privacy/moderation/validation;
3. integration: consent/rewards/auth isolation/API contracts;
4. deterministic LLM mocks;
5. live-provider canary как отдельный non-blocking/controlled lane;
6. Playwright full 5-lesson loop;
7. accessibility smoke;
8. artifact upload: report, trace, video, screenshot, sanitized logs.

Нельзя считать блокированный/пропущенный тест pass. Для каждого skip нужна причина, owner и deadline.

## 17. Порядок работы модели-исполнителя

### Pass A — discovery, без исправлений

1. Повторить baseline.
2. Построить route/data-flow map.
3. Выполнить API/auth/consent негативную матрицу.
4. Выполнить полный E2E и LLM dataset.
5. Зарегистрировать дефекты по шаблону.
6. Передать отчёт SOL-аудитору.

### Pass B — исправления после приоритизации SOL

Для каждого одобренного дефекта: сначала failing regression test, затем минимальное исправление, затем targeted test и полный gate. Не смешивать независимые исправления.

### Pass C — независимый release re-test

Исполнитель начинает с чистой БД/checkout, повторяет все P0/P1 и полный regression pack, сравнивает с baseline и выпускает `GO/NO-GO` recommendation.

## 18. Обязательный итоговый отчёт исполнителя

```text
1. Executive summary: GO / NO-GO и 5 главных причин
2. Tested revision/environment
3. Coverage: выполнено / пропущено / заблокировано
4. Counts: P0/P1/P2/P3
5. Таблица всех дефектов с evidence links
6. 5-lesson matrix: correct/wrong/borderline/safety/latency
7. API auth-consent matrix
8. Cross-account isolation result
9. Browser/device/a11y matrix
10. Performance/load results
11. Integration fault-injection results
12. Data/privacy/legal gaps (без юридических выводов от модели)
13. Flaky tests and reproducibility issues
14. Exact commands and exit codes
15. Files changed during fixes
16. Remaining risks and proposed release conditions
17. Machine-readable JSON appendix
```

В отчёте запрещены формулировки «кажется работает», «проверено вручную» без evidence и «all tests pass», если хотя бы один тест blocked/skipped/flaky.

