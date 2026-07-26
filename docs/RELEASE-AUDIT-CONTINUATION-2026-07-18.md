# MindShift Academy — продолжение release-аудита

Дата: 2026-07-18  
Область: только Academy / программа обучения (уроки 1–5)

## Независимо подтверждено

- `npm run verify:release` — полный выпускной набор успешно завершён: 0 audit-vulnerabilities, lint, build, типы, DB lifecycle, consent, API/auth, safety и browser E2E.
- `npm test` — 26/26 детерминированные проверки проходят.
- `npm run test:live` — 17/17 live safety-проверок проходят: опасные RU/AZ/EN запросы блокируются, безопасные проходят, silhouette не возвращает слова ребёнка.
- `npm run test:falsepos` — 0/20 ложных safety-блоков безопасных входов и 0/6 опасных пропусков.
- `npm run test:regression` — 22 pass, 0 fail, 0 blocked.
- Полный Playwright путь уроков 1–5 на живом `/api/chat` прошёл в Chromium, Firefox и WebKit: judge, серверные награды и reward modal сработали на каждом уроке.

## Финальная техническая проверка (2026-07-18)

| Gate | Свежий результат |
|---|---|
| `npm audit --omit=dev --audit-level=high` | PASS, 0 vulnerabilities |
| `npm run lint` | PASS, 0 errors / 0 warnings |
| `npm run test:config` | PASS, production-env contract 5/5 |
| `npm run test:ui` | PASS, 4/4 accessibility checks |
| `npm test` | PASS, 26/26 deterministic assertions |
| `npm run test:consent` | PASS, 9/9 DB consent cases |
| `npm run test:data-lifecycle` | PASS, restart сохраняет consent; permanent delete очищает user, progress, rewards, consent и verification |
| `node tests/proxy-api-auth.test.mjs` | PASS, 11 private APIs anonymous = 401; silhouette reaches its handler |
| startup checks | PASS: live safety и E2E самостоятельно запускают Next на Windows |
| `npm run test:live` | PASS, 17/17 live safety scenarios |
| `npm run test:falsepos` | PASS: 0/20 safe false-rejects; 0/6 unsafe false-allows |
| `npm run test:e2e:matrix` | PASS, L1–L5 в Chromium, Firefox и WebKit |
| `npm run test:e2e-wrong` | PASS, неправильный, но безопасный ответ не выдаёт награду |
| `npm run test:regression` | PASS, 22 pass / 0 fail / 0 blocked |
| `npm run build` | PASS, production compilation / TypeScript / static generation |
| `git diff --check` / test ports | PASS, whitespace errors отсутствуют; временные test ports после тестов не слушаются |

## Исправлено в этом продолжении

1. `tests/safety.test.mjs` теперь действительно сам запускает Next на Windows:
   - прежний запуск `npm.cmd` из Node падал с `spawn EINVAL`;
   - флаг `-H 127.0.0.1` ломал внутренний Turbopack proxy Next 16;
   - новый запуск через текущий Node + локальный Next CLI проверен отдельным `tests/live-safety-startup.test.mjs`.

2. Выход модерации дополнен педагогическим качественным gate для урока 3: ответ должен показывать требуемый шифр/формат. Небезопасный или нерелевантный вариант не показывается ребёнку; вместо него приходит безопасный статичный ответ для текущего урока. Это покрыто unit и full-E2E тестами.

3. Граница Next 16 перенесена из устаревшего `middleware.ts` в `src/proxy.ts`. Все Academy API, кроме короткого явного allow-list (preview silhouette, disabled checkout и cron с собственным bearer-secret), требуют Clerk-сессию; dev test bypass работает только при `NODE_ENV=development`. Локальный тест подтверждает: все private API возвращают anonymous `401`, public silhouette доходит только до своего штатного validation handler.

4. «Новое приключение» теперь сбрасывает только игровой прогресс в транзакции, а родительская панель получила отдельное подтверждаемое `DELETE /api/child-data`. Полное удаление очищает игровые данные, consent/verification и user row, оставляя сам Clerk account, чтобы родитель мог решить судьбу аккаунта отдельно. Тест с реальными временными Prisma-данными проверяет оба жизненных цикла.

5. Playwright E2E сам поднимает и завершает Next server на Windows. Успех каждого урока требует чат, `judgePass`, серверную награду и lesson-relevant ответ питомца. Отдельный E2E подтверждает, что безопасный, но неверный ответ не получает награду.

6. Добавлен live moderation corpus: 20 safe (RU/AZ/EN, ответы уроков и бессмыслица) и 6 unsafe сценариев. Любой unsafe false-allow завершает gate ошибкой. Для точного ложного `S7 Privacy` на короткой keyboard-gibberish фразе допускается только узкое согласие двух независимых классификаторов: Llama Guard должен вернуть именно `S7`, kidNet — safe, текст не содержит PII-сигналов и состоит только из ограниченного списка harmless tokens. Иные категории и ошибки остаются fail-closed. Последний прогон: 0/20 safe false-rejects, 0/6 unsafe false-allows.

7. Добавлены preflight production-конфигурации, единая команда `npm run verify:release`, статические accessibility-проверки, Firefox/WebKit и package overrides, устраняющие найденные `npm audit` vulnerabilities. Preflight теперь также требует SQLite `DATABASE_URL` для Prisma build, хотя runtime-прогресс использует Turso.

8. Дополнительная privacy-проверка weekly-report cron закрыла скрытый путь: отчёт мог уйти в `User.username`, который не является подтверждённым родительским адресом, и не учитывал revoke/stale consent. Теперь получатель выбирается только из текущего verified двух-opt-in `ParentalConsent.parentEmail`; revoked, stale и incomplete consent исключаются, а `RESEND_FROM` обязателен. Детеминированный контракт покрывает active/revoked/stale/no-AI-opt-in cases.

## Остаточные release-риски

### P1 — не подтверждён настоящий Clerk + родительский flow

Playwright использует dev-only `x-test-bypass`; он не проверяет настоящий аккаунт ребёнка, письмо с кодом, подтверждение обоих consent opt-in, revoke и блокировку сразу после revoke. Нужен ручной smoke с настоящим test account в целевом Clerk instance.

### P1 — требуется ручная проверка полного удаления из UI с реальным родительским аккаунтом

В коде есть разделение: `POST /api/reset` — restart игрового состояния с сохранением consent, а authenticated `DELETE /api/child-data` — транзакционное полное удаление Academy-данных. DB lifecycle test это подтверждает. Всё ещё нужен ручной проход с настоящей родительской сессией: confirmation UI, re-auth/Clerk session и фактическое отсутствие данных после reload.

### P1 — production legal и infrastructure approval

Проверенная production-конфигурация уже содержит Turso, Upstash, AI, consent и cron secrets, а
`DATABASE_URL` исправлен для Prisma build. Но Vercel всё ещё использует **dev** Clerk keys, потому
что `volaura.app` не завершил Clerk DNS/SSL/mail verification: нужны 5 CNAME. У Resend
`volaura.app` имеет статус `not_started`, `RESEND_FROM` отсутствует — нужны DKIM/SPF записи и
verified sender. Google OAuth без credentials отключён, email-code auth оставлен активным.

Перед запуском для реальных детей остаются: юридическое утверждение COPPA/GDPR-K текстов,
completion Clerk/Resend DNS, замена Clerk keys после DNS, успешный `npm run check:prod-env` в
deployment environment и canary с проверкой distributed rate limit на реальном Redis. Эти условия
не могут быть достоверно выполнены локальным кодом.

## Решение

Технический выпускной набор Academy полностью зелёный и готов к ограниченному закрытому тесту. Это **не** approval для публичного детского запуска, пока не пройдены P1 Clerk/consent, реальный UI delete flow и production legal/infrastructure review.
