# Task 1 — Supply-chain и Vercel packaging

Контекст: это первая локальная задача финального RU-only релиза MindShift Academy. Работай только в `C:\Projects\mindshift-academy`; общая рабочая копия dirty, чужие изменения сохранять. Не коммить, не push, не deploy.

## Global constraints

- Ни один секрет не печатать и не читать из `.env`.
- `.env`, `.env.*`, `.clerk/` и локальные SQLite-файлы не входят в Vercel source bundle; `.env.example` остаётся доступен.
- Production release требует `npm audit --omit=dev --audit-level=high` с нулём уязвимостей.
- Next остаётся на 16.x; перед изменением уже прочитан `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md`.
- Существующие пользовательские изменения не переписывать.

## Files

- Create: `.vercelignore`
- Create: `tests/release-packaging.test.mjs`
- Modify: `package.json`
- Modify mechanically: `package-lock.json`

## Required TDD cycle

1. Создать `tests/release-packaging.test.mjs`, который читает `.vercelignore` и `package.json` и проверяет:
   - правила `.env`, `.env.*`, `!.env.example`, `.clerk/`, `*.db`, `dev.db`, `prisma/dev.db`;
   - `next` и `eslint-config-next` равны `16.2.11`;
   - `prisma` и `@prisma/client` равны `7.9.0`;
   - overrides `sharp` равен `0.35.3`, `fast-uri` равен `3.1.4`.
2. Запустить `node tests/release-packaging.test.mjs` и зафиксировать ожидаемый FAIL из-за отсутствующей конфигурации.
3. Добавить `.vercelignore` с точным содержимым:

```gitignore
.env
.env.*
!.env.example
.clerk/
*.db
dev.db
prisma/dev.db
```

4. Обновить package versions. Сохранить существующий override `next.postcss=8.5.19`; убрать устаревший override `@prisma/dev.@hono/node-server`, если Prisma 7.9 больше не тянет этот пакет; добавить `sharp=0.35.3`, `fast-uri=3.1.4`.
5. Обновить lockfile через npm. `npm audit fix --force` запрещён.
6. Запустить:
   - `node tests/release-packaging.test.mjs`
   - `npm audit --omit=dev --audit-level=high`
   - `npm run build`
7. Выполнить self-review diff только своих файлов.

## Report contract

Записать полный отчёт в `.superpowers/sdd/task-1-report.md`: статус DONE/DONE_WITH_CONCERNS/BLOCKED, файлы, RED evidence, GREEN evidence, audit/build results, concerns. В ответ координатору вернуть только статус, одну строку результатов и concerns.
