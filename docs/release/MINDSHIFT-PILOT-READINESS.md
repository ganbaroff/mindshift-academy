# MindShift — Готовность к пилоту V1

*31.07.2026 · документ-спутник канона продукта (`docs/canon/MINDSHIFT-PRODUCT-CANON-V1.md`) · единственная согласованная истина о том, что живёт, что сломано, чего не хватает и что заблокировано гейтами.*

## 1. Состояние продукта по классам

| Класс | Что именно | Риск / примечание |
|---|---|---|
| LIVE на проде | Деплой эпохи 24.07 (Azure GPT-4o тьютор), канонический URL `academy.volaura.app` (`docs/RELEASE-STATUS-2026-07-24.md`) + алиас на vercel-поддомене | Точное текущее соответствие алиас↔деплой НЕИЗВЕСТНО, требует проверки перед любым новым деплоем (см. разделы 7, 8) |
| LOCAL, закоммичено, НЕ задеплоено | Волны безопасности (коммиты `2a54913`, `d14ed08`) + весь пакет канона (продукт-канон, этот документ) | Прод расходится с локальным HEAD — см. противоречие 6 |
| LEGACY, флаг выключен по умолчанию | Путь `/lesson`, старый чат (`PromptInput`), модалка `MonsterCard`; поля стриков заморожены | Держать выключенным весь пилот; удаление — отдельным PR после ревью пилота |
| ACTIVE, но противоречит канону | Случайность гачи, живёт в проде | Решение: заменить детерминированным сундуком вех — см. противоречие 4 |
| UNTESTED | Новая UI `/session` (w1-s1..s3) не имеет прямых e2e-тестов | Гейт волны 3 — см. противоречие 7 |
| UNKNOWN — проверить до деплоя | (а) существуют ли session-runtime таблицы в прод Turso; (б) какие ключи Clerk (dev/live) стоят на проде; (в) состояние домена Resend | Блокирует parity-деплой волны 3 (разделы 7, 8) |

## 2. Сводный реестр дефектов

Источник: `docs/PREMIERE-AUDIT-2026-07-29.md` (69 пунктов: 20 P0, 30 P1, 19 P2) + находки текущего дня, помечены NEW-01..05 в 2.5. Реестр ниже — единственный источник диспозиции; сам аудит задним числом не редактируется.

### 2.1 Закрыто и разрешено (14 пунктов: 13 коммитами + 1 архитектурой)

Коммитами `2a54913` (wave 1: consent-гейты, привязка ученика к сессии, erasure, fail-closed sim-chat) и `d14ed08` (wave 1b: consent-race, разлок повторного входа, дисклеймеры, mood floor, i18n/аудио/контраст) закрыты: **P0-01, P0-02, P0-04, P0-05, P0-06, P0-07, P0-08, P0-09, P0-12, P0-18, P0-20, P1-07**, плюс разлок кода для возвращающегося ребёнка (пункт вне исходного аудита). Отдельно, вне пути коммитов, **P1-01** (`middleware.ts`) снят архитектурой Next 16 — `src/proxy.ts` уже покрывает эту функцию (см. §2.3). Итого разрешено 14 пунктов: 13 коммитами `2a54913`/`d14ed08` + 1 архитектурой (P1-01, `proxy.ts`).

### 2.2 Открытые P0 — диспозиция

- **P0-03** (нет истории миграций, нет baseline) → волна 3.
- **P0-10** (контраст градиентной кнопки отправки) → область legacy-чата; закрывается либо удалением legacy, либо проходом по токенам волны 3.
- **P0-11** (нет haptic-обратной связи) → ПЕРЕКЛАССИФИЦИРОВАН в P2 (обоснование: усиление опыта, а не гейт безопасности или обучения для пилота).
- **P0-13** (нет active-состояний нажатия) → волна 2.
- **P0-14** (z-index конфликт сплэша и модалки награды) → область legacy.
- **P0-15 + P0-16** (токены дизайна: opacity, hex «чёрного») → волна 3, единый атомарный проход.
- **P0-17** (44 английских текста ошибок API) → волны 2–3 (`errors.ts`).
- **P0-19** (противоречие онбординга и роутинга) → волна 2 (см. противоречие 1).

### 2.3 P1 — акценты

- **P1-01** (нет `middleware.ts`) — ФАКТИЧЕСКИ СНЯТ архитектурой: Next 16 `proxy.ts` уже покрывает страницы и API; фиксируется как resolved-by-architecture.
- **P1-02** (нет consent-проверки на дашборде) → волна 2.
- **P1-03** (транзакция вознаграждения не атомарна) → область legacy.
- **P1-04** (race daily-claim гачи) → становится неактуальным после удаления гачи.
- **P1-05** (гонка при первом визите) → уже решено (upsert).
- **P1-08** (паттерны PII в `minimizeChildText` неполны) → волна 3.
- **P1-29** (спокойный экран при отзыве согласия среди сессии) → волна 2.
- Остальные P1 accessibility/UX-пункты → распределены по бакетам волн 2–3 (раздел 4).

### 2.4 P2

19 исходных пунктов + переклассифицированный P0-11 → бакет после пилота, кроме случаев, когда пункт тривиально бандлится с уже идущей работой волны.

### 2.5 NEW — находки 31.07.2026

- **NEW-01** — у сессионной UI нет прямых e2e → гейт волны 3.
- **NEW-02** — прод не соответствует локальному коду по паритету деплоя → волна 3 (гейт CEO).
- **NEW-03** — письмо согласия по умолчанию на азербайджанском → волна 2 (по умолчанию ru, AZ — в спящем режиме).
- **NEW-04** — лендинг и экран ввода кода игнорируют уже существующую сессию (трение для возвращающегося ребёнка) → волна 2.
- **NEW-05** — контент недель 2–5 отсутствует → волна 1 (крупнейший объём работы).

## 3. Девять противоречий — разрешены

### Противоречие 1 — Онбординг обещает старый курс

- Свидетельство: онбординг обещает legacy-курс (пять уроков), сессии поставляют курс мышления.
- Решение V1: переписать копирайт и роутинг онбординга под путь мышления (вылупление яйца остаётся; обещание «5 уроков» убрать).
- Затронуто: страница онбординга, копирайт.
- Риск: низкий.
- Волна: 2.
- Гейт проверки: e2e онбординга → w1-s1.

### Противоречие 2 — Legacy-путь из пяти уроков сосуществует

- Свидетельство: старый путь `/lesson` живёт в коде параллельно новому.
- Решение V1: остаётся выключенным флагами окружения `LEGACY_MODULE1_ENABLED` и `E2E_LEGACY_LESSONS` (оба должны быть НЕ `"1"`) на весь пилот; запланировано УДАЛЕНИЕ после ревью пилота.
- Затронуто: флаги `LEGACY_MODULE1_ENABLED` / `E2E_LEGACY_LESSONS` в `src/proxy.ts` (строки 26–27), позже — отдельный PR на удаление.
- Риск: утечка флага в проде — закрывается гейтом ниже.
- Волна: 2 (проверка) + после пилота (удаление).
- Гейт проверки: в прод-окружении `LEGACY_MODULE1_ENABLED` и `E2E_LEGACY_LESSONS` не равны `"1"`.

### Противоречие 3 — Сертификат существует только как текст модалки

- Свидетельство: сертификат — это копирайт внутри старой модалки, отдельной страницы нет.
- Решение V1: собрать настоящую страницу `/certificate` по контракту вовлечения (маршрут + гейтинг выходят в волне 2; достижимый контент — к концу пилота, когда выйдет неделя 5).
- Затронуто: новый маршрут, matcher proxy, закрытие капстоуна.
- Риск: средний (новая поверхность).
- Волна: 2.
- Гейт проверки: e2e капстоуна → страница печати сертификата.

### Противоречие 4 — Случайность гачи и поля стриков против канона благополучия ребёнка

- Свидетельство: гача со случайностью и поля стриков живут в проде и противоречат разделу 6 продукт-канона.
- Решение V1: детерминированный сундук вех заменяет гачу; стрики остаются замороженными; существующие предметы наследуются (grandfathered).
- Затронуто: `GachaCalendar`, `/api/gacha/claim`, дашборд.
- Риск: дети, которым нравился элемент случайности, — смягчается более богатыми детерминированными наградами.
- Волна: 2.
- Гейт проверки: детерминированный тест доказывает отсутствие случайного пути награды; скан копирайта.

### Противоречие 5 — Письмо согласия только на азербайджанском против русского V1

- Свидетельство: письмо согласия существует только на азербайджанском, продукт V1 — русскоязычный.
- Решение V1: локаль по умолчанию — ru; AZ-шаблон остаётся в спящем режиме для фазы 2.
- Затронуто: вызовы `consent-email.ts`.
- Риск: тривиальный.
- Волна: 2.
- Гейт проверки: unit-тест на значение локали по умолчанию.

### Противоречие 6 — Прод отстаёт от локальных фиксов безопасности

- Свидетельство: прод не содержит коммиты `2a54913`/`d14ed08`.
- Решение V1: parity-деплой ПЕРВЫМ действием волны 3, как всегда — по явному слову CEO.
- Затронуто: деплой.
- Риск: до parity-деплоя прод не имеет фиксов волны 1/1b.
- Волна: 3.
- Гейт проверки: прод-smoke показывает поведение после `d14ed08` (например, рейт-лимит на GET активации) + подтверждена карта алиасов.

### Противоречие 7 — У новой сессионной UI нет прямых e2e

- Свидетельство: `/session` (w1-s1..s3) не покрыт e2e-тестами.
- Решение V1: playwright e2e для w1-s1..s3 сейчас; каждая новая неделя выходит вместе со своим e2e.
- Затронуто: тесты.
- Риск: регрессии невидимы до появления тестов.
- Волна: 3.
- Гейт проверки: CI зелёный, включая session e2e.

### Противоречие 8 — Нет истории миграций / доказательства отката

- Свидетельство: вся схема применена через `db push`, истории миграций нет.
- Решение V1: закоммитить baseline SQL snapshot (`migrate diff`) + правило «только аддитивные» изменения БД на время пилота + задокументированный workflow `turso-db-push` (раздел 8 контракта состояния ученика).
- Затронуто: `prisma/`, скрипты, документация.
- Риск: дрейф схемы до выполнения.
- Волна: 3.
- Гейт проверки: baseline закоммичен + проведена одна учебная попытка отката (rollback drill).

### Противоречие 9 — Нет основы юридических страниц / поддержки / аналитики

- Свидетельство: нет страниц приватности, условий использования, поддержки; нет аналитики.
- Решение V1: поддержка на пилоте = прямой канал оператора (CEO) + видимая контактная строка на дашборде и в согласии (волна 4); аналитика = только SQL-агрегаты собственной БД поверх уже сохранённых учебных записей, никаких сторонних трекеров для детей никогда (разрешённый список = существующие таблицы; запрещено: фингерпринтинг, рекламные пиксели, внешние SDK); юридические страницы = черновики, собранные из существующего текста согласия, явно помеченные как черновики (волна 3); проверка юристом — залогированный ПРЕД-ПУБЛИЧНЫЙ ГЕЙТ (не блокер пилота для 10 приглашённых семей по действующему потоку согласия).
- Затронуто: дашборд, документация, две новые страницы.
- Риск: задокументирован.
- Волна: 3–4.
- Гейт проверки: страницы живут как черновики + контактная линия ответила на тестовое сообщение + оформлена запись гейта юриста.

## 4. Волны внедрения

- **Волна 1 (крупнейшая).** Создать контент недель 2–5 (12 сессий) + четыре новых семейства исполнителей (`sequence-world`, `rule-runner`, `pattern-expand`, `claim-check`) + валидатор контента + fixtures интерпретатора. Источник: документ curriculum V1.
- **Волна 2 (связность пути).** Переписать онбординг; landing/ввод кода осознаёт уже вошедшего пользователя; маршрут + гейтинг сертификата; стадии эволюции + сундук вех вместо гачи; письмо согласия по умолчанию ru; спокойный экран отзыва согласия; active-состояния нажатия; старт `errors.ts`.
- **Волна 3 (рельсы доверия).** Parity-деплой (гейт CEO); session e2e; baseline миграций + drill; проход по токенам (P0-15/16 + P0-10, если legacy ещё присутствует); оставшиеся английские ошибки; расширение паттернов PII; юридические черновики; контакт поддержки; собственные SQL-метрики.
- **Волна 4 (операции пилота).** Выдача кодов 10 семьям по `docs/PARENT-ACCESS-RUNBOOK.md`; приветственное письмо родителю; еженедельный отчёт v2 (мастерство по навыку + где ребёнок застревал больше всего + вопрос для разговора за ужином); протокол инцидента; drill kill-switch (флаг окружения выключен → путь ИИ отключён → сессии плавно деградируют в детерминированный режим).

## 5. Матрица QA

Дорожки: детерминированные unit-гейты (`npm test`); e2e chromium (вход и сессия — также firefox/webkit); a11y smoke; скан RU-лексикона копирайта (запрещённые слова); fail-closed дриллы (классификатор недоступен, интерпретатор недоступен, судья недоступен); драйв потолка стоимости (бюджет токенов на сессию); драйв восстановления (обновление страницы посреди сессии, смена устройства, повторный ввод кода).

| Поверхность | Unit (`npm test`) | E2E chromium | A11y smoke | RU-лексикон scan | Fail-closed drill | Cost-ceiling drill | Resume/recovery drill |
|---|---|---|---|---|---|---|---|
| Вход / код | ✓ | ✓ (+ firefox/webkit) | ✓ | ✓ | — | — | ✓ (повторный ввод кода) |
| Активация | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Онбординг | — | ✓ (→ w1-s1) | ✓ | ✓ | — | — | — |
| Сессия — grid-drawing (неделя 1) | ✓ | ✓ (+ firefox/webkit) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Сессия — sequence-world (неделя 2) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Сессия — rule-runner (неделя 3) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Сессия — pattern-expand (неделя 4) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Сессия — claim-check (неделя 5, капстоун) | ✓ | ✓ (→ сертификат) | ✓ | ✓ | ✓ | ✓ | ✓ |
| Дашборд | ✓ | ✓ | ✓ | ✓ | — | — | — |
| Сертификат | ✓ (гейтинг) | ✓ (капстоун → печать) | ✓ | ✓ | — | — | — |
| Согласие + отзыв | ✓ | ✓ | ✓ | ✓ | ✓ (revoke среди сессии) | — | ✓ (спокойный экран после revoke) |
| Стирание / сброс | ✓ | ✓ | — | — | ✓ | — | — |

## 6. Метрики пилота и фальсифицируемые ворота

- Активация: ≥8/10 детей проходят s1.
- Завершение недели 1: ≥7/10.
- Возврат на 7-й день: ≥5/10 (из собственного плана CEO).
- Полное прохождение пути: ≥6/10 к неделе 6.
- Инциденты безопасности: 0 (ЛЮБОЙ инцидент = жёсткая остановка + протокол).
- Прочтение отчёта родителем: ≥7/10.
- «Готовы платить»: ≥3/10.
- **ТРИГГЕР РЕДИЗАЙНА**: завершение недели 1 ниже 50%, ИЛИ один и тот же паттерн замешательства замечен у 3+ детей.

## 7. Ворота NO-GO перед приглашением семей

- Все диспозиции открытых P0 исполнены (03, 13, 15, 16, 17, 19 + NEW-01..05 по своим волнам) (P0-10 и P0-14 исключены из этого гейта, поскольку живут в legacy-пути, выключенном по умолчанию — см. противоречие 2).
- Session e2e зелёный в CI.
- Прод = локальный паритет, подтверждено smoke-тестом.
- Проведён один полный реальный семейный проход от начала до конца (аккаунт собственной семьи оператора).
- Поток согласия протестирован вживую, включая отзыв и стирание.
- Пройден drill kill-switch.
- Подтверждена карта alias/URL.
- Экран согласия на проде называет актуальных вендоров (Azure OpenAI — тьютор/судья; NVIDIA Llama Guard — классификатор вреда; Google Gemini — независимый слой безопасности): текст согласия до миграции на Azure мог по-прежнему называть только NVIDIA — версия согласия `2026-07-24` подтверждена на проде.

## 8. Откат и границы одобрения

- **Откат кода**: мгновенный откат Vercel к предыдущему деплою.
- **БД**: только аддитивные изменения на время пилота — старый код всегда безопасен.
- **Прод-деплой и любая прод-миграция**: только явное слово CEO (постоянная граница; два независимых отказа агентов зафиксированы как доказательство, что guard работает).
- **Реакция на инцидент**: выключить флаг ИИ → детерминированный режим деградации (уже свойство продукта) → затем оценка, связь с родителем, лог.

---

## Appendix — nine-reviewer sweep, 2026-08-06

Nine independent reviewers (5 project personas, 3 child personas, 1 competitor study).
Two items were fixed the same day and are closed; the rest are open and unprioritised.

RETRY WALL — first attempt FAILED, fixed on the second (2026-08-07):
- A failed task could not be answered again in place: the Check button was replaced by
  "Попробовать ещё или дальше", wired only to advance. Found independently by two child
  reviewers.
- Commit 1e1d4fc claimed to fix it and did not. It changed the booleans but left the
  footer as one either/or ternary (`showAdvance ? advance : showStructuredCheck ? check`),
  and `showAdvance` is true after ANY verdict — so the Check branch stayed unreachable and
  the label got strictly worse ("Пропустить" alone). A code review caught it; a11y receipt
  A12 had gone green only because the deleted label survived inside a code comment.
- The real fix renders the two controls in independent slots: unanswered -> Check;
  failed -> Check AND Пропустить; passed -> Дальше. A12 now asserts that structure instead
  of a label substring, and the two e2e suites that waited on the deleted label were
  repointed at `[data-testid="session-primary-check"]` staying visible after a failure.
- Still unverified in a real browser: the e2e suites covering this path
  (`test:e2e:current-sessions`, `scripts/e2e/coach-smoke.mjs`) are not in CI or in
  `verify:release`, which only exercises the legacy `/lesson` route. Wiring them in is the
  open follow-up — without it this same regression can ship green again.
- `html { font-size: 15px }` on the mobile breakpoint scaled every rem down (text-sm
  13.1px, text-xs 11.25px; 41 nodes under the 16px floor on the home page). Now 16px.

OPEN — trust, blocks recruitment:
- `/privacy` states it is a draft with no legal force ("ЧЕРНОВИК — требует подтверждения
  юриста"). A parent reviewer stopped at that line. Owner decision: finish it or unlink it.
- The landing screen never says the pilot is free; "бесплатно" appears only on `/start`
  and `/request-access`. Same for the operator's name.
- `/start` explains the real 7-action path but nothing on the home page links to it, and
  the manual-approval wait has no stated duration.

OPEN — content defect:
- `src/content/curriculum/week-2/session-2.ts` — 3 of 4 required tasks ("вставь
  недостающий шаг", "найди дыру в почти готовом плане", "восстанови полный порядок")
  presuppose a plan already on the board, but `SequenceSurface.tsx:29` starts empty.
  `practiceRequired: 3` makes all three unavoidable.

OPEN — child-facing UI:
- `/enter-code` boxes are 30x45px at 320px wide — the one control an unsupervised child
  must use, 14px under the 44px minimum. Hint audio button is 30x30px.
- No mechanism reacts to repeated failure: hints are static, priced from the first
  attempt, and hidden behind a footer icon the child must find.

OPEN — privacy:
- `minimizeChildText` (`src/lib/privacy.ts:21-27`) strips email/phone before the judge and
  tutor calls but NOT before moderation, so raw child text — including volunteered PII —
  reaches the classifier providers. kidNet's PII rule targets requests for data, not
  self-disclosure.
- `tasks/attempt/route.ts:288` and `chat/route.ts:99` log raw provider errors whose
  message can carry child-derived text; sibling catches in the same files log `err.name`.
- Prompt-injection defence is one probabilistic classifier rule with no backstop in the
  tutor's own system prompt.

OPEN — engineering:
- CI never runs `verify:release`, `test:consent`, `test:live`, `test:falsepos`, `test:ui`.
  A consent or safety regression can merge on the fast subset alone.
- Clerk's three auth scripts (235KB) load on `/` and `/request-access`, where no sign-in
  form renders — 38-42% of page weight for a first-time visitor.
- The legacy lesson island (`app/lesson/[id]`, `components/chat/*`, `api/chat`, plus
  `progression.ts` and `rewards.ts` exports) is still referenced by four tests inside
  `verify:release`. Retire the tests before the code, or commit to keeping it.

COMPETITOR FINDING (10 products reviewed): none of them gate first access behind human
approval. The three frictions unique to us are the unbounded manual wait, the email
round-trip that breaks the session, and the parent hand-retyping an 8-character code on
the child's device. Cheapest fixes, in order: state the expected wait; keep consent and
code issuance in the same browser tab; end consent on a "hand this device to your child"
screen with the code already filled in.
