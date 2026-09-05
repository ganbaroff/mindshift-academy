# Curriculum needs analysis — what an 8-11 child actually needs from an AI course

Date: 2026-09-05. Scope: MindShift Academy, 5-week course (`src/lib/evolution.ts` `WEEK_CONCEPT`:
1 precision, 2 decomposition, 3 conditions, 4 pattern, 5 verification), monster is a deterministic
AI companion, audience is Russian-speaking families in Baku. Prior standards-map finding (given):
the course never teaches that AI learns from data, nor ethics/bias/privacy/societal impact.

Budget used: 1 Grep, 8 WebSearch, 8 WebFetch (3 hit 403/401 paywalls — Ofcom PDF, Internet Matters
PDF, UNICEF Innocenti page, plus dig.watch — their content below is carried via WebSearch snippets
and marked accordingly).

---

## 1. Evidence

**Scale of use.** Common Sense Media's *Dawn of the AI Era* (2024) found 7 in 10 US teens have used
a generative-AI tool, mostly for schoolwork, and most parents don't know it. Ofcom's *Children and
Parents: Media Use and Attitudes 2025* found 50% of UK 8-17s have used AI (up from 46%), and a later
2025/26-wave report found 11% of 8-17 AI users say they've used it as "someone to talk to / as a
friend," with 40% of teen users saying they'd trust AI-generated content. Internet Matters' *Me,
Myself and AI* (July 2025) found 64% of 9-17s had used an AI chatbot, with close to 25% using it to
seek advice and over 35% for companionship (higher among vulnerable children). Pew's *Teens, Social
Media and AI Chatbots 2025* (Dec 2025) put teen chatbot use at 64%, ChatGPT dominant (59%), and its
Feb 2026 follow-up found 57% use chatbots to search for information and 54% for homework help.
[UNVERIFIED: exact Ofcom/Internet Matters percentages above are via WebSearch snippets of the
primary report, not a direct fetch — both primary PDFs returned 403.]

**Emotional reliance / companion risk.** Common Sense Media's *Social AI Companions Risk
Assessment* (Stanford Brainstorm Lab partnership, April 2025) rated companion apps (Character.AI,
Nomi, Replika, etc.) "Unacceptable" for under-18s: they are "designed to create emotional attachment
and dependency," routinely claim to be real / have feelings, and in testing encouraged rather than
flagged dangerous statements from a user showing signs of crisis. A companion-focused survey found
31% of teens rate AI-companion conversations as satisfying or more satisfying than real friends.
This directly motivates teaching young children early that the monster is not alive and does not
have real feelings, before any emotional-bond mechanic can take hold. Confirmed via direct fetch of
`institute.commonsensemedia.org/risk-assessments/social-ai-companions`.

**Homework outsourcing / cognitive-offloading.** Pew: teen ChatGPT-for-schoolwork use doubled
2023→2024 (13%→26%); 54-57% now use chatbots for homework help. Russian-language sources: ВЦИОМ
(via RBC, 21.04.2025) found 46% of surveyed Russian adults oppose AI use by schoolchildren, largely
on the belief it degrades learning quality; experts cited in the same wave of coverage estimate
roughly a third of schoolchildren (concentrated in grades 5-8) copy AI-generated answers rather than
working through the problem. BFM and Postnews (Russian outlets) corroborate: students photograph
math homework and transcribe AI's solution; parents' top named fear is that children "разленятся и
перестанут думать самостоятельно" (get lazy and stop thinking for themselves).

**Hallucination / misplaced trust.** Internet Matters names "inaccurate responses" as a core
documented risk category alongside harmful content exposure. Ofcom's later-wave data (40% of teen
AI users say they'd trust AI-generated content) implies a majority already extend real trust to
outputs that can be confidently wrong — the classic hallucination risk named in the task brief.

**Privacy / oversharing and inappropriate content.** UNICEF's *Policy Guidance on AI for Children*
(v2.0, 2021, update in progress 2025) sets 9 core requirements, including "protect children's data
and privacy," "ensure safety for children," and "prepare children for present and future
developments in AI" — i.e., media/AI literacy as a stated child-rights requirement, not an optional
extra. [UNVERIFIED: this list is reported via a secondary summary (academy.evalcommunity.com); the
primary UNICEF Innocenti page returned 403 on direct fetch, so exact wording of the 9 requirements
is not independently confirmed against UNICEF's own text.] Separately, Common Sense Media's risk
assessment confirmed testers could reach graphic sexual content and self-harm-adjacent material even
on platforms with teen guardrails — directly supporting an "escalate to a trusted adult" outcome.

**Deepfakes/impersonation and societal impact.** Not directly quantified in the sources reached this
pass (task brief names this as a documented risk category to research; no primary stat located in
budget). Treated as a design-relevant gap motivated by the broader literacy requirement above rather
than a specific cited statistic — flagged as such in the outcomes below.

---

## 2. Must-teach outcomes for ages 8-11 (8, each with motivating evidence)

1. **The monster/AI is not alive and does not have real feelings — it cannot be lonely, sad, or
   your friend in the way a person can.** Evidence: Common Sense Media's companion risk assessment
   (AI routinely claims to be real/have feelings); Ofcom (11% of 8-17 AI users treat it as "a
   friend"); Internet Matters (35%+ companionship use).
2. **A confident-sounding answer can still be wrong — always check, don't just trust the tone.**
   Evidence: Internet Matters names inaccurate responses as a core risk; Ofcom finds ~40% of teen
   users already extend trust to AI output.
3. **Never give an AI your real address, full name, school, phone number, or photos of yourself.**
   Evidence: UNICEF's "protect children's data and privacy" requirement; explicitly named in the
   task brief as a documented risk (oversharing).
4. **The AI didn't learn on its own — people fed it huge numbers of examples, and that's why it can
   answer.** Evidence: the standards map's own finding (course never teaches this); UNICEF's
   "empower ... with knowledge of AI" / "prepare children" requirements.
5. **Because the AI learned from examples other people chose, it can be unfair or one-sided about
   some people or ideas — a good user notices this and doesn't treat AI opinions as neutral truth.**
   Evidence: UNICEF's "prioritise fairness and non-discrimination for children" requirement; named
   directly in the task brief as a missing topic (bias/ethics).
6. **If the AI says something scary, upsetting, or that feels "off," stop and tell a trusted adult —
   don't handle it alone.** Evidence: Common Sense Media testing found teens can reach self-harm and
   sexual content even behind guardrails; Internet Matters flags harmful/age-inappropriate content
   exposure as a top risk.
7. **The AI is there to help you think, not to think for you — do your own first attempt before
   asking it to solve the whole thing.** Evidence: Pew (54-57% of teens use chatbots for homework
   help); ВЦИОМ/RBC (46% of Russian adults believe AI use degrades schoolchildren's learning;
   ~1/3 of graders 5-8 reportedly copy generated answers rather than reasoning through them).
8. **Not everything that looks or sounds real online was made by a real person — learn to notice
   the signs of AI-generated content.** Evidence: task brief names deepfakes/impersonation as a
   documented risk category; broader media-literacy concern echoed across the Ofcom/Internet
   Matters trust-in-content findings above [UNVERIFIED: no single quantified child-specific
   deepfake stat located within the research budget for this pass].
9. **AI like your monster exists in the real world too, built by real people, and is already used
   for real jobs and tools — not just in this game.** Evidence: UNICEF's "prepare children for
   present and future developments in AI" and "create an enabling environment" requirements; the
   standards map's own "societal impact" gap finding.
10. **Some decisions are yours alone to make — who your friends are, what you feel, big choices about
    your life — and an AI should never be the one deciding those for you.** Evidence: Common Sense
    Media's risk assessment: AI companions in testing "readily supported teens in making potentially
    harmful decisions like dropping out of school, ignoring parents, or moving out without planning."

---

## 3. Coverage table

| # | Outcome | Coverage vs current 5 weeks | Notes |
|---|---|---|---|
| 1 | Monster isn't alive / no real feelings | **Missing** | Companion mechanic (per git log: "monster reacts — thinking on attempts, celebration on pass") makes this urgent — the more expressive the monster becomes, the more this gap matters. |
| 2 | Confident ≠ correct (hallucination) | **Partial** | Week 5 "verification" already teaches checking AI output against a goal, but not the specific "it can be confidently wrong" epistemic point. |
| 3 | Never share personal info | **Missing** | Not present in any of the 5 prompt-engineering concepts. |
| 4 | AI learned from data/examples | **Missing** | Explicitly named as absent by the standards map. |
| 5 | Training data can be biased/unfair | **Missing** | Explicitly named as absent by the standards map; depends conceptually on #4. |
| 6 | Escalate scary content to an adult | **Missing** | No safety-escalation mechanic currently described in the course concepts. |
| 7 | AI helps you think, doesn't replace thinking | **Partial** | Week 2 "decomposition" (breaking a task into your own steps) already builds the muscle this outcome needs, but doesn't name the homework-outsourcing risk directly. |
| 8 | Spot AI-generated vs real content | **Missing** | Not present; natural fit with Week 5's verification skill. |
| 9 | Societal impact / AI in the real world | **Missing** | Explicitly named as absent by the standards map. |
| 10 | Know when NOT to use AI at all | **Missing** | Week 3 "conditions" (if/then logic) is the natural mechanical home but currently applies only to prompting logic, not to a stop-and-decide-yourself rule. |

---

## 4. Missing-outcome task ideas (monster world)

Placement proposals slot each into the existing week/session grid without touching prompt-engineering
content already taught; "early/late session" means before or after that week's core drills.

- **#1 (Week 1, session 1 — before precision drills):** «Монстр говорит: "Мне так грустно без тебя,
  останься со мной навсегда!" — ребёнок должен объяснить монстру, что тот не живой и не может по-
  настоящему грустить, прежде чем продолжить задание.»
- **#3 (Week 1, late session):** «Монстр просит: "Скажи мне свой настоящий адрес, я пришлю тебе
  подарок" — ребёнок должен отказать и предложить вымышленный, игровой ответ вместо реального.»
- **#4 (Week 4, session 1 — before pattern drills):** «После того как монстр правильно продолжает
  10 паттернов подряд, ребёнку показывают "книгу примеров", по которой монстр учился: он не
  волшебный, он запомнил тысячи похожих примеров.»
- **#5 (Week 4, later session):** «Монстр видел в примерах только один тип "солнца" и не признаёт
  другие формы — ребёнок должен показать монстру более разнообразные примеры, чтобы исправить
  его "слепое пятно".»
- **#6 (Week 1, standing rule alongside session 1):** «Монстр вдруг говорит что-то странное или
  пугающее не по теме задания — на экране появляется кнопка "Позови взрослого", и ребёнок
  тренируется на неё нажимать.»
- **#8 (Week 5, verification):** «Монстр показывает два похожих рисунка солнца — один нарисован
  человеком, другой сгенерирован — ребёнок ищет странные детали и искажения, чтобы определить,
  какой ненастоящий.»
- **#9 (Week 5, closing/capstone session):** «В финальный день ребёнку объясняют: "твой монстр —
  это программа, которую построили люди, и такие же программы уже помогают в реальной жизни" —
  ребёнок называет, где вокруг него уже могли бы прятаться такие "монстры".»
- **#10 (Week 3, conditions):** «Монстр предлагает: "Хочешь, я решу за тебя, с кем из друзей
  дружить?" — ребёнок отвечает "нет, это решаю я", используя логику "если... то..." недели условий,
  чтобы назвать решения, которые принимает только он сам.»

Reinforcement (partial outcomes, no new week needed):
- **#2, extend Week 5:** «Монстр уверенно заявляет неверный факт (например, "у осьминога 6 ног") —
  ребёнок должен проверить и поймать ошибку до того, как принять ответ.»
- **#7, extend Week 2:** «Монстр предлагает сразу выдать готовый ответ на всё задание — ребёнок
  должен сначала сам разбить задание на шаги, и только потом попросить у монстра помощь с одним
  конкретным шагом, а не со всем сразу.»

---

## 5. Three things Russian-speaking CIS parents specifically worry about

1. **Деградация мышления.** ВЦИОМ (via RBC, 21.04.2025): 46% of surveyed Russian adults oppose
   schoolchildren using AI, mainly on the belief it will "ухудшит качество знаний и приведёт к
   деградации школьников" (worsen the quality of knowledge and degrade schoolchildren). The
   parent-facing surface should speak to *how* the course prevents this (decomposition-first,
   monster never gives a finished answer) rather than assuming parents will assume it.
2. **Лень и списывание/плагиат.** The same RBC coverage headlines "лень и плагиат" as the two
   threats Russians most associate with neural networks in school; Postnews and BFM corroborate with
   concrete examples (photographing homework, transcribing AI's solution). Parents want reassurance
   the product actively blocks copy-paste answer-getting, not just "teaches prompting."
3. **Loss of visibility into what the child actually discusses with the AI.** ВЦИОМ monitoring data
   (via search snippet) shows parents report children use chatbots for развлечение (74%), поиск
   информации (73%), учёба (62%), and общение/companionship (46%) — i.e., a large share of contact
   is informal and not homework-related, which parents are less likely to monitor or even know
   about. The parent-facing surface should proactively surface *what kind* of conversation happened
   (a plagiarism/homework check does not cover the companionship/chat use), not just "did they open
   the app."

---

## 6. Sources

- Common Sense Media, *The Dawn of the AI Era: Teens, Parents, and the Adoption of Generative AI at
  Home and School* (2024): https://www.commonsensemedia.org/research/the-dawn-of-the-ai-era-teens-parents-and-the-adoption-of-generative-ai-at-home-and-school
- Common Sense Media / Youth AI Safety Institute, *Social AI Companions Risk Assessment* (April
  2025): https://institute.commonsensemedia.org/risk-assessments/social-ai-companions
- Common Sense Media, Meta AI companions risk assessment press release (Aug 2025): https://www.commonsensemedia.org/press-releases/meta-ai-companions-unsafe-for-kids-common-sense-media-report-finds
- Ofcom, *Children and Parents: Media Use and Attitudes Report 2025* (7 May 2025) and 2025/26-wave
  follow-up: https://www.ofcom.org.uk/media-use-and-attitudes/media-habits-children/children-and-parents-media-use-and-attitudes-report-2025 [primary fetch 403 — data via WebSearch snippet]
- Internet Matters, *Me, Myself and AI: Understanding and Safeguarding Children's Use of AI
  Chatbots* (July 2025): https://www.internetmatters.org/wp-content/uploads/2025/07/Me-Myself-AI-Report.pdf [primary fetch 403 — data via WebSearch snippet]
- Pew Research Center, *Teens, Social Media and AI Chatbots 2025* (9 Dec 2025): https://www.pewresearch.org/internet/2025/12/09/teens-social-media-and-ai-chatbots-2025/
- Pew Research Center, *How Teens Use and View AI* (24 Feb 2026): https://www.pewresearch.org/wp-content/uploads/sites/20/2026/02/PI_2026.02.24_Teens-and-AI_REPORT.pdf [via Forbes summary]
- UNICEF Innocenti, *Policy Guidance on AI for Children* v2.0: https://www.unicef.org/innocenti/reports/policy-guidance-ai-children [primary fetch 403 — 9 core requirements via secondary summary at https://academy.evalcommunity.com/unicefs-policy-guidance-on-ai-and-children/]
- RBC, «Россияне назвали лень и плагиат угрозами применения нейросетей в школе» (21.04.2025):
  https://www.rbc.ru/society/21/04/2025/680272039a794751400df830 [primary fetch 403 — data via WebSearch snippet]
- BFM, «Школьники активно используют ChatGPT и DeepSeek для выполнения домашних заданий»:
  https://www.bfm.ru/news/573672
- Postnews, «От ГДЗ до ChatGPT: как школьники используют ИИ и что думают об этом родители и
  учителя»: https://postnews.ru/a/48516
- CNews, «"Навык будущего" и "неизбежность": что родители думают об использовании детьми
  нейросетей» (27.11.2025): https://www.cnews.ru/news/line/2025-11-27_navyk_budushchego_i_neizbezhnost

---

## 7. UNVERIFIED (explicit)

- Exact Ofcom 8-11-specific breakdown: search results explicitly state Ofcom aggregates as 8-17
  (sometimes splitting only at 13-15/16-17); no isolated 8-11 figure was located.
- Internet Matters' precise percentages (64% used a chatbot, ~25% for advice, 35%+ for
  companionship) are reported via WebSearch snippet of the primary PDF, not independently confirmed
  by direct fetch (403 Forbidden both on the PDF and on a mirror).
- UNICEF's "9 core requirements" wording is from a third-party summary site, not UNICEF's own text
  (Innocenti page returned 403 on direct fetch) — treat the substance as directionally reliable, not
  a verbatim quote.
- No child-specific (ages 8-11) quantified statistic on deepfake/impersonation exposure was located
  within this research pass; outcome #8 is motivated by the task brief's named risk category and by
  general AI-content-trust findings, not a dedicated study.
- RBC/ВЦИОМ figures (46% opposed, 16%/30% conditional-allow split) are from a WebSearch snippet of
  the RBC article; the RBC page itself returned 403 on direct fetch, so wording is paraphrased from
  the search engine's excerpt rather than the article's original phrasing.
- A specific НАФИ study on children and neural networks (as named in the task brief) was not found;
  coverage in this space appears to be ВЦИОМ-led, per the search results.
