# Prompt for GPT-6 ASTRA — external critique of the Sprint-3 design & curriculum decisions (optional escalation)

Paste everything below this line, then attach the three files named in «Attachments».

---
You are reviewing the redesign plan of MindShift Academy, a Russian-language browser course that teaches instruction design («prompting readiness») to children aged 8-11 through a monster companion that executes the child's instructions (deterministic judge, five task families: grid-draw, sequence-world, rule-runner, pattern-expand, claim-check; 5 weeks × 3 sessions × ~5 tasks). It is in a closed pilot with real families in Baku; production runs Next.js on Vercel. Two sprints already shipped: a session intro screen (story → goal → «готово, когда» → one CTA), a one-goal-line task shell with a single collapsible disclosure, five per-week visual world themes, and a companion that thinks on attempts and celebrates on pass.

Attachments: (1) DESIGN-BRIEF.md — consolidated from six benchmark reports (Duolingo, Brilliant, Coursera, Udemy, Codecademy, Khan Kids, Kodable, Uchi.ru et al.) plus live CSS-token measurements; (2) CURRICULUM-VERDICT.md — consolidated from five evidence reports (readability scan of all 266 child strings, standards map vs AI4K12/UNESCO/CSTA, pedagogy literature, needs analysis, difficulty calibration); (3) SPRINT-3-MASTER-PROMPT.md — the owner's decisions and ordered backlog.

Please answer, in English, with concrete references to the attachments:
1. Design: which of the token and screen decisions (48 px buttons, 16 px radius, h1 40/h2 28, one instruction line ≤8 words, collapsed disclosure, distinct «incorrect» companion state, no red, settle-after-3-cycles idle loops, CSS/SVG companion instead of Rive) would you reverse for Russian-speaking 8-11 year olds, and why? Name the strongest evidence you know that the brief missed.
2. Curriculum: is keeping the positioning narrow («instruction design», not «AI literacy») while adding only two outcomes now (AI is not alive / never share personal data) defensible for a paid children's course in 2026? What would parents and regulators (COPPA/ICO AADC-style) expect at minimum?
3. Backlog: re-rank S3-1 … S3-14 by expected effect on a child's comprehension and completion in the first two sessions. What would you cut entirely?
4. Risks: name the three most likely ways this plan fails in the pilot, each with the cheapest test that would reveal it within one week.
Output format: four numbered sections, ≤900 words total, decisions stated as imperatives, no restatement of the attachments.
