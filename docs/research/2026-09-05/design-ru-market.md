# RU-market benchmark: kids' edtech task screens (2-4 класс)

Date: 2026-09-05. Scope: Учи.ру, Skysmart, Фоксфорд, Умскул, Яндекс Учебник, Алгоритмика. No material found for ЯКласс/Учи.Дома in 7 queries — not covered.

## Per-platform

### Учи.ру (strongest source set — two Uchi.ru design-team Habr posts)
Sources: [habr.com/…/516356](https://habr.com/ru/companies/uchi_ru/articles/516356/) (design principles for non-reading children), [habr.com/…/490324](https://habr.com/ru/companies/uchi_ru/articles/490324/) (interface error-finding).
1. **Instruction length**: "текста не должно быть много… лучше, если слово будет всего одно" — task-screen text ideally one word. Between tasks: one screen, one button ("Решать дальше") to stop drop-off.
2. **Mascot**: dino "Grisha" (2015) for younger kids, teens get superhero characters — "персонажи… помогают налаживать контакт с детьми", not decoration.
3. **Buttons**: only buttons look clickable, everything else deliberately non-clickable-looking; min 30px height, tap target > visible size; exit top-left, next-step bottom-center; max one primary CTA/screen.
4. **Text/input**: min 16px font; kids read syllable-by-syllable to age 9-12, fluent scanning ~13-14; input text centered (kids tap box centers); passwords shown in plaintext while typing (masking makes kids lose their place).
5. **Color**: flat design, saturated colors on light background, high contrast for boundary clarity.
6. **Measured error fixes** (instrumented click-logging, methodist+designer+illustrator+dev+QA loop): single-select controls needed auto-deselect of prior pick (error 30%→20%); an 800ms "barrel" animation caused 85-90% of students to click blocked arrows repeatedly; ambiguous wording "какая часть закрашена" (12% picked grey/white) fixed to concrete "какая часть зелёная?" (−66% errors).
7. **Parent affordance**: complex/small text is a deliberate signal for the child to call an adult — not a bug, a designed escalation path.
No dedicated Uchi.ru "design system" document was found on Behance — only branding/illustration galleries; not usable as a UX source.

### Skysmart (Skyeng kids)
Source: [case.beaversbrothers.ru/skysmart](https://case.beaversbrothers.ru/skysmart) — design agency's own case study (self-reported, not third-party audited).
1. Two rounds of usability testing with real kids/teens before ship; round 1 fixed both lesson and game interface, round 2 confirmed "дети вовлекаются в урок и хорошо понимают материал".
2. Two protagonist variants (boy/girl) so a child can self-insert ("примерять роль на себя").
3. Sensitive-topic restraint: a bullying lesson avoided harsh imagery, showed all three roles (victim/aggressor/observer) plus an assertive de-escalation model.
4. End-state feedback: results screen + FAQ answering follow-up questions, combining assessment with reinforcement.
5. One lesson offered in three formats (video / interactive game / facts) for different engagement styles.
No hint/help-button or ты/вы tone detail surfaced in this source.

### Яндекс Учебник — UNVERIFIED primary source
Direct WebFetch of education.yandex.ru/uchebnik/main failed to return usable content; everything below is from the WebSearch result summary only, not a confirmed fetch.
1. Three separate role interfaces — teacher / student / parent; teacher has one-click "Предпросмотр" to see the exact student view before assigning.
2. Explicit ФГОС (state standard) alignment used as the trust anchor.
3. Scale claims (>100,000 tasks, used in "75% of Russian schools") — vendor marketing, not independently confirmed.
4. Paid "Яндекс Плюс + Детям" tier bundles extra practice, a hard-topic "тренажёр", STEM webinars, "Финансовая грамотность" and **"Безопасность в интернете"** — internet-safety is sold as a parent-facing feature, not just a policy page.
5. Seasonal gamification: quests/meta-subject tasks tied to holidays appear periodically.

### Алгоритмика
Source: [algoritmika.org/ru](https://algoritmika.org/ru) (fetched homepage; all figures vendor-self-reported).
1. Trust-signal stacking: avg parent rating 4.7 (Yandex Maps 4.9, 2GIS 5.0), Moscow Dept. of Education license, corporate partner logos (Sber, Yandex, SberTech, 2ГИС), "1 of 20 candidates becomes a mentor", "<3% quit after starting".
2. Outcome-framing for parents: portfolio-of-projects narrative, "potential junior developer" career pipeline.
3. Kid-facing gamification: "Hall of Fame", monthly project minimums + year-end diploma, narrative framing ("help virtual characters", "intern at IT companies").
4. Explicit tone split: parent copy = formal/ROI; child copy = playful/achievement language.
Caveat: content skews to older/pre-teen kids, not MindShift's 8-11 band — lower-confidence transfer.

### Умскул (umschool.net) — teens/ЕГЭ-ОГЭ prep, weakest age-match
Source: [umschool.net](https://umschool.net) (fetched homepage; figures vendor-self-reported).
1. Credential-stacking: "выпускники и педагоги топовых… вузов", "авторы федеральных образовательных программ, эксперты ЕГЭ и ОГЭ".
2. Hard numeric claims: "700 000+ учеников", "каждый 11-й стобалльник 2026 года… готовился в Умскул", avg score 85.04, named student stories (age+score).
3. Third-party validation cited: "одобрено экспертами ФИПИ", HSE quality assessment, license in footer.
4. Progress promise to the student directly, in ты-form: "ты сможешь следить за успеваемостью: видеть, какие темы освоены, сколько домашних заданий выполнено".
5. Tone split: student copy casual/ты + reassurance ("Переживать не стоит"); parent copy formal, ROI-framed ("экономия в 2-3 раза").

### Фоксфорд — thinnest coverage, largely UNVERIFIED
Direct fetch of foxford.ru returned HTTP 401 (capability block; not retried, per the single-attempt rule for blocks). Only search snippets surfaced: an email/CRM case study (330+ marketing emails/month, via emailmaker.ru) with no task-screen UX detail, and DTF/LiveJournal login-flow instructions implying separate student/parent/teacher cabinets — consistent with the Yandex Uchebnik/Umschool pattern but **not independently confirmed**. No task-screen UX case study for Foxford was located in this pass; do not cite Foxford as a confirmed pattern source.

### Cross-platform gamification ethics
Source: [blog.rt.ru](https://blog.rt.ru/b2c/chem-geymifikaciya-detskih-prilozheniy-otlichaetsya-ot-vzroslyh.htm) — single source, not cross-checked (a second candidate, pikabu.ru's 2024-2025 gamification research roundup, was found but not fetched due to budget).
1. Adults respond to status/discounts/career; kids respond to curiosity/imagination — virtual "персонажи, о которых нужно заботиться" (characters to take care of) drive return visits, plus celebratory animations and "внезапные сюрпризы".
2. Leaderboards are explicitly used **less** in kids' apps than adults' — flagged as a pressure/comparison risk.
3. Dual-audience constraint: the parent must see skill-progress evidence, not just engagement/time-spent — the parent decides renewal, not the child.
4. Age-tuned complexity: preschoolers can't parse complex rank systems; teens find flat instant-reward loops boring — MindShift's 8-11 cohort sits in the "simple, not babyish" middle band.
5. Gap: the source contains **no** discussion of manipulative/dark-pattern ethics — not fabricated here, flagged as an open item.

## 5 recommendations for MindShift (screen/component named)

1. **Task screen instruction line** (the "one goal line" shipped in commit `0239d11`): enforce a hard cap of ~6-8 words / one short clause, matching Uchi.ru's ≤1-word-ideal standard and its stated reason — kids read syllable-by-syllable until ~age 12. Source: habr.com/…/516356.
2. **Hint affordance on the attempt screen**: replace a generic "Подсказка" label with the companion monster itself as the ask-for-help action ("Спроси монстра"), escalating in ≤2 steps (nudge → partial reveal, never silent answer-reveal) — mirrors Uchi.ru's one-CTA-per-screen discipline and its parent-escalation logic (complex text = call an adult).
3. **Multi-choice task components**: any selection control in the attempt flow must auto-deselect the prior pick on a new click — this is Uchi.ru's own measured fix (error 30%→20%), directly portable.
4. **Progress framing on week/world screens** (theme worlds shipped in `7e77063`): keep progress personal-only (own-history stars/crystals), never cross-child leaderboards — per blog.rt.ru's finding that RU kids'-apps use competitive ranking less, precisely to avoid pressure on this age band.
5. **Celebration/attempt feedback copy** (companion reactions shipped in `e3ffd46`): praise must name the specific action taken ("Ты попросил монстра объяснить по шагам!") rather than generic "Молодец!" — this is Uchi.ru's concreteness fix (vague wording → 12% error; naming the exact attribute → −66% error) applied to praise copy instead of instruction copy.

## Russian copy-tone rules for age 8-11 (with sources)

- **Address form**: ты throughout all child-facing copy (confirmed in Умскул's student copy and Algoritmika's "playful, achievement-driven" register); reserve вы for parent-facing screens/emails (seen as the consistent parent-register across Умскул and Algoritmika). Sources: umschool.net, algoritmika.org/ru.
- **Sentence length**: one short clause per instruction; avoid subordinate clauses — kids read slowly by syllables to 9-12, full scanning fluency arrives ~13-14. Source: habr.com/…/516356.
- **Verbs**: concrete, single-action, tied to the exact visible UI element — Uchi.ru's field-tested fix replaced an abstract category ("закрашена") with a concrete, nameable attribute ("зелёная"), cutting errors 66%. Apply the same concreteness to MindShift's prompt-writing task instructions.
- **Praise wording**: name the specific correct action, not a generic compliment (see recommendation 5); avoid comparison language ("ты обогнал N детей") — RU gamification sources flag ranking-language as a pressure risk for this age band. Source: blog.rt.ru.
- **Error wording**: never verdict-first. Uchi.ru's whole design ethos treats a wrong answer as a fixable wording/attempt problem, not a child failing — frame retries as the monster's suggestion, not a judgment.
- **Exclamation marks**: sparing — reserve for the genuine pass/celebration moment only, echoing Uchi.ru's "max one primary CTA / one clear reward moment per screen" restraint; decorating ordinary instructions with "!" dilutes the one moment it should matter.
- **Forbidden/avoid**: literal "ошибка"/"неправильно" as the first word a child sees; global rank/leaderboard position language ("уровень N из M" with cross-child comparison) for this age band.

## What Russian parents look for (trust signals)

- **Credential-stacking**: named teacher qualifications, explicit selectivity ("1 of 20 candidates becomes a mentor" — Algoritmika), federal-program authorship claims (Умскул).
- **Independent/official validation**: state licensing shown in-footer (Algoritmika: Moscow Dept. of Education; Умскул: license + "одобрено ФИПИ" + HSE quality assessment); state-standard alignment (ФГОС, cited by Яндекс Учебник).
- **Specific, not vague, outcome numbers**: "700 000+ учеников", "1 in 11 perfect scorers", "avg score 85.04", named student stories with age+score (Умскул) — specificity itself functions as a trust signal, generic adjectives don't.
- **Aggregated third-party ratings, not just in-house testimonials**: Algoritmika cites its own average across Yandex Maps/2GIS (4.7 overall, 4.9/5.0 breakdown).
- **A parent-specific interface, not just "there's a report"**: Яндекс Учебник's three-role system and Умскул's promise of topic/homework-level completion visibility — parents want per-topic completion, not aggregate time-spent.
- **Safety-adjacent literacy bundled as a sellable feature**: Яндекс Учебник packages "Безопасность в интернете" inside its paid parent tier — internet safety marketed as content, not buried in a policy page.
- **B2B-style credibility transfer in a B2C kids' product**: corporate partner logos (Sber, Yandex, SberTech, 2ГИС) on Algoritmika's homepage.

## UNVERIFIED (explicit)

- Яндекс Учебник section rests on a WebSearch summary only — the direct WebFetch of the homepage failed to return usable content; scale claims (100k tasks, 75% of schools) are unverified vendor marketing.
- Фоксфорд: homepage fetch blocked (HTTP 401), not retried per the one-strike-on-block rule; no task-screen UX material was found for Foxford in this pass — everything cited is peripheral (email/CRM case, login instructions).
- Skysmart case study is the design agency's own self-reported material (marketing for the agency), not third-party audited.
- All Algoritmika/Умскул numeric claims (ratings, student counts, avg scores, dropout %) are vendor-self-reported homepage copy, not independently audited.
- blog.rt.ru gamification-ethics claims are single-sourced; a second candidate (pikabu.ru's 2024-2025 research roundup) was found but not fetched, and the source contains no discussion of manipulative/dark-pattern ethics.
- Algoritmika and Умскул content predominantly targets teens/ЕГЭ-ОГЭ or portfolio-building older kids, not MindShift's 8-11/2-4 класс cohort — treat their patterns as lower-confidence than Uchi.ru/Skysmart, which are directly age-matched.
- ЯКласс and Учи.Дома: no material surfaced across the 7 queries run; not covered.
