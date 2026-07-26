# MindShift Academy — Module 1: Launch & Revenue Plan
> Atlas (L5 Overseer) — 2026-06-24. Думаю как фаундер, не как бот.
> Sources: NotebookLM deep research, codebase audit, Forest/Llama Life/Tiimo analysis.

---

## Часть 1: Что у нас есть (verified)

### Код — 12 API routes, build clean
| Компонент | Статус | Файл |
|-----------|--------|------|
| Landing + воронка | ✅ done | page.tsx + FunnelExperience.tsx |
| Силуэт монстра API | ✅ done | /api/generate-silhouette |
| LemonSqueezy checkout | ✅ done | /api/checkout |
| Webhook → DB | ✅ done | /api/webhooks/lemonsqueezy |
| Clerk auth gate | ✅ done | middleware.ts (onboarding + lesson + dashboard) |
| Onboarding (hatching) | ✅ done | /onboarding (3 фазы) |
| 5 уроков curriculum | ✅ done | curriculum.ts + /lesson/[id] |
| Chat + validation | ✅ done | /api/chat (374 строки, 5 challenge checks) |
| Gacha calendar | ✅ done | GachaCalendar.tsx + /api/gacha/claim |
| Crystal upsell | ✅ done | CrystalUpsellButton.tsx + /api/parent/reward-crystals |
| TTS voice | ✅ done | /api/tts (OpenAI Alloy) |
| Mood decay CRON | ✅ done | /api/cron/mood-decay |
| Weekly email | ✅ done | /api/cron/weekly-report + email template |
| Parent dashboard | ✅ done | /dashboard (real DB + inventory) |
| Mobile/a11y polish | ✅ done | 44px targets, safe-area, reduced-motion |

### Что НЕ проверено end-to-end
- Реальный пользовательский путь в браузере (landing → payment → hatch → lesson → dashboard)
- LemonSqueezy с реальным ключом
- Clerk с реальным ключом
- Email отправка через Resend
- TTS с реальным OpenAI ключом
- Deploy на Vercel

---

## Часть 2: Что нужно отполировать в Module 1 (перед первым пользователем)

### P0 — Блокеры запуска (без этого нельзя показывать людям)

1. **E2E verification с реальными ключами**
   - CEO: добавить в `.env`: OPENAI_API_KEY, CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_VARIANT_ID, LEMONSQUEEZY_WEBHOOK_SECRET, RESEND_API_KEY, CRON_SECRET
   - Пройти весь путь: landing → 3 слова → силуэт → оплата → onboarding → урок 1 → награда → урок 2 → dashboard

2. **Error states для детей**
   - Сейчас: при ошибке API дети видят "Не удалось..." — технический текст
   - Нужно: монстр "засыпает" с мягкой анимацией + "Попробуй ещё раз через минутку 🌙"
   - Shame-free: НИКОГДА "ошибка", "проблема", "неправильно" → только "монстр задумался", "связь потерялась"

3. **Звуковой feedback**
   - Сейчас: TTS endpoint есть, но НЕ вызывается из UI
   - Нужно: при успешном прохождении урока — голосовая реплика монстра через TTS
   - При ошибке — мягкий звук (Web Audio API chirp, не файл)
   - Toggle в настройках (дети в школе = mute)

4. **Onboarding → DB sync verification**
   - Antigravity добавил POST /api/monster на confirmName
   - Нужно: проверить что monster name/emoji/color реально сохраняются и появляются в /lesson и /dashboard

### P1 — Качество Module 1 (отличие от "работает" и "кайф использовать")

5. **Микро-анимации на каждое действие ребёнка**
   - Отправил промпт → пульсация монстра (heartbeat scale 1→1.05→1, 300ms)
   - Прошёл урок → конфетти/блёстки (CSS particles, не библиотека)
   - Получил кристаллы → crystal counter fly-in animation
   - Gacha drop → сундук открывается (keyframe sequence)

6. **Lesson transitions**
   - Между уроками: fade-out → "Глава 2: Настройка характера" splash (1.5s) → fade-in
   - Progress bar сверху: 1/5 → 2/5 → ... → 5/5

7. **Mochi-like companion reactions**
   - Монстр реагирует на промпт: idle → thinking (глаза моргают) → responding (рот двигается) → happy (прыжок) при успехе
   - Простые CSS transforms, не sprite sheets

8. **Sound design**
   - Ambient: мягкий loop (Web Audio synthesized, 40Hz hum + pink noise, 5% volume)
   - Success: восходящая нота (C4→E4→G4, sine wave, 200ms)
   - Failure: мягкий спуск (E4→C4, sine wave, 300ms)
   - Typing: subtle tick (noise burst, 10ms, 2% volume)

### P2 — Retention polish

9. **"Скучаю" push notification**
   - Если ребёнок не заходил 24h → push: "{monsterName} скучает по тебе 😢"
   - Через 48h → push: "{monsterName} грустит... Зайди поиграть!"
   - Через 72h → email родителю (уже реализовано через weekly report)

10. **Daily quest на главном экране**
    - `getActiveDailyQuest()` уже работает
    - Нужно: карточка на /dashboard с текущим квестом дня + награда
    - При выполнении → immediate crystal drop animation

---

## Часть 3: Модули 2-5 (roadmap после Module 1)

> **SUPERSEDED 2026-07-27.** The prompt-engineering Modules 2–5 table below is historical.
> Active curriculum authority is `docs/superpowers/specs/2026-07-27-thinking-curriculum-design.md`
> (thinking/logic course, 5 weeks × 3 sessions, executable-task engine). Do not implement the
> PvP / prompt-arena track from this section unless that design is explicitly revived.

Module 1 = "Пробуждение" (5 уроков, промпт-инжиниринг basics) — still the live product until the
thinking curriculum ships Week 1.

| Module | Тема | Уроков | Новая механика | Цена |
|--------|------|--------|----------------|------|
| 1 | Пробуждение (basics) | 5 | Базовый Tamagotchi, Gacha | 29 AZN/mo |
| 2 | Эволюция (intermediate) | 7 | Эволюция монстра (3 формы), командные битвы | +0 (подписка) |
| 3 | Мастерская (advanced) | 7 | Создание своих промптов для друзей, sharing | +0 (подписка) |
| 4 | Турнир (competitive) | 5 | PvP промпт-арена, рейтинг, сезоны | +0 (подписка) |
| 5 | Наставник (mastery) | 5 | Ребёнок учит младших, создаёт уроки | Premium 49 AZN/mo |

---

## Часть 4: Go-to-Market (Азербайджан первый)

### Неделя 1-2: Closed beta (10 семей)
- **Канал:** Личные контакты CEO + 2-3 частные школы Баку (Landau, MTK)
- **Формат:** "Бесплатно на 2 недели, вашему ребёнку понравится"
- **Цель:** 10 детей прошли Module 1, 5 вернулись на Day 7
- **Метрика:** completion rate по урокам, drop-off point, mood decay pattern

### Неделя 3-4: Open beta (50 семей)
- **Канал:** Instagram stories/reels (ребёнок играет с монстром), TikTok
- **Формат:** "Ваш ребёнок научится общаться с ИИ за 5 уроков — 29 AZN/месяц"
- **Ключевое:** видео родителя, который показывает dashboard + "мой ребёнок научился..."
- **Цена:** 29 AZN/mo, first week free (trial period в LemonSqueezy)

### Месяц 2-3: Scale (200+ семей)
- **Каналы:** ASAN Xidmət партнёрство, блогеры-мамы, школьные чаты WhatsApp
- **Реферальная петля:** "Пригласи друга → оба получают 500💎 и Rare skin"
- **B2B:** пакеты для школ (10 учеников = скидка 40%)
- **Цель:** 200 платящих семей = 5,800 AZN/mo MRR

### Месяц 4+: CIS expansion
- Русскоязычная версия (уже готова — весь UI на русском)
- Казахстан, Грузия, Узбекистан
- Цена адаптируется: KZ = 4,990 ₸, GE = 25 ₾, UZ = 99,000 сум

---

## Часть 5: Unit economics

| Метрика | Значение |
|---------|----------|
| CAC (customer acquisition) | ~5 AZN (Instagram ads, school partnerships) |
| Monthly price | 29 AZN |
| LTV (avg 4 months retention) | 116 AZN |
| LTV/CAC | 23x |
| OpenAI cost per kid/month | ~0.50 AZN (gpt-4o-mini, tts-1, limits) |
| Infra (Vercel + Turso + Resend) | ~15 AZN/mo fixed |
| Breakeven | 2 paying families |
| Target MRR (month 3) | 5,800 AZN (~$3,400) |

---

## Часть 6: Immediate next actions

### CEO (сегодня):
1. `.env` keys: OPENAI, CLERK, LEMONSQUEEZY, RESEND, CRON_SECRET
2. Vercel deploy
3. E2E walkthrough с реальными ключами

### Atlas (backend):
1. Daily quest card endpoint
2. Push notification trigger на mood decay
3. Referral system API

### Antigravity (frontend):
1. TTS wiring (call /api/tts from lesson chat on monster reply)
2. Micro-animations (heartbeat, confetti, crystal fly-in)
3. Lesson transition splashes
4. Error states → shame-free monster reactions

### Оба:
1. E2E test: landing → оплата → hatch → 5 уроков → dashboard
2. Mobile test на iPad + iPhone
3. First 3 beta families recruited

---

## Одна строка

**Module 1 code-complete. Нужен deploy + 10 детей + polish анимаций. Revenue starts at family #2.**
