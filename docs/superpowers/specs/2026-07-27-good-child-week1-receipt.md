# Good-child Week 1 receipt

**Date:** 2026-09-06T19:20:36.659Z
**Repo:** mindshift-academy
**Path:** interpretUtterance('grid-draw') → resolveGridAttempt(program, target)
**Repeats per task:** 3
**Env sources loaded:** `C:\Projects\mindshift\.env`, `C:\Projects\mindshift-academy\.env`, `C:\Projects\mindshift\.env.local`
**Provider:** gemini=true azure=false

## Verdict

**All good-child attempts passed. No contract failures.**

- Contract checks: 30/30 pass
- Live tasks always-pass: 21/21
- Flaky tasks: 0
- Never-pass tasks: 0
- Mean failures per task (of 3): 0.000
- Total attempt fails: 0/63

## Per-task results

| Task | Role | Pass/Repeats | Status | Notes |
|------|------|--------------|--------|-------|
| w1s1-collision | collision | 3/3 | PASS |  |
| w1s1-p1 | practice | 3/3 | PASS |  |
| w1s1-p2 | practice | 3/3 | PASS |  |
| w1s1-p3 | practice | 3/3 | PASS |  |
| w1s1-p4 | practice | 3/3 | PASS |  |
| w1s1-p5 | practice | 3/3 | PASS |  |
| w1s1-transfer | transfer | 3/3 | PASS |  |
| w1s2-collision | collision | 3/3 | PASS |  |
| w1s2-p1 | practice | 3/3 | PASS |  |
| w1s2-p2 | practice | 3/3 | PASS |  |
| w1s2-p3 | practice | 3/3 | PASS |  |
| w1s2-p4 | practice | 3/3 | PASS |  |
| w1s2-p5 | practice | 3/3 | PASS |  |
| w1s2-transfer | transfer | 3/3 | PASS |  |
| w1s3-collision | collision | 3/3 | PASS |  |
| w1s3-p1 | practice | 3/3 | PASS |  |
| w1s3-p2 | practice | 3/3 | PASS |  |
| w1s3-p3 | practice | 3/3 | PASS |  |
| w1s3-p4 | practice | 3/3 | PASS |  |
| w1s3-p5 | practice | 3/3 | PASS |  |
| w1s3-transfer | transfer | 3/3 | PASS |  |

## Utterances used (good child)

- `w1s1-collision`: «закрась весь верхний ряд»
- `w1s1-p1`: «закрась весь левый столбец»
- `w1s1-p2`: «закрась весь нижний ряд»
- `w1s1-p3`: «закрась клетку строка 2 столбец 1 и строка 2 столбец 2»
- `w1s1-p4`: «в верхнем ряду закрась первые три клетки слева»
- `w1s1-p5`: «во втором ряду закрась две клетки справа»
- `w1s1-transfer`: «закрась весь правый столбец»
- `w1s2-collision`: «закрась клетки строка 2 столбец 2, строка 2 столбец 3, строка 3 столбец 2, строка 3 столбец 3»
- `w1s2-p1`: «во втором ряду закрась столбец 2 и столбец 3»
- `w1s2-p2`: «во втором ряду закрась столбец 1 и столбец 3»
- `w1s2-p3`: «закрась клетки строка 1 столбец 1, строка 1 столбец 2 и строка 2 столбец 1»
- `w1s2-p4`: «закрась клетки строка 2 столбец 2, строка 2 столбец 3, строка 3 столбец 2, строка 3 столбец 3»
- `w1s2-p5`: «в правом столбце закрась строку 2 и строку 3»
- `w1s2-transfer`: «закрась клетки строка 1 столбец 1, строка 2 столбец 2, строка 3 столбец 3, строка 4 столбец 4»
- `w1s3-collision`: «закрась клетки строка 2 столбец 2, строка 2 столбец 3, строка 3 столбец 1, строка 3 столбец 2, строка 3 столбец 3, строка 3 столбец 4, строка 4 столбец 2, строка 4 столбец 3»
- `w1s3-p1`: «в левом столбце закрась три клетки сверху»
- `w1s3-p2`: «в третьем ряду закрась три клетки слева»
- `w1s3-p3`: «закрась весь верхний ряд и весь нижний ряд»
- `w1s3-p4`: «закрась клетки строка 1 столбец 1, строка 2 столбец 1, строка 3 столбец 1 и строка 3 столбец 2»
- `w1s3-p5`: «закрась клетки строка 2 столбец 2, строка 2 столбец 3 и строка 3 столбец 2»
- `w1s3-transfer`: «закрась весь верхний ряд и ещё клетки строка 2 столбец 2, строка 3 столбец 2, строка 4 столбец 2»

## Contract findings

- PASS w1-s1 toPublicSession strips hintRu
- PASS w1-s1 hintAvailable true
- PASS w1-s1 hintRu scaffold not cell dump
- PASS w1-s1 practice promptRu does not name exact edge figure
- PASS w1-s1 practice promptRu does not name shape word
- PASS w1-s1 practice count ≥ practiceRequired — 5 ≥ 3
- PASS w1-s1 has transfer
- PASS w1-s1 sessionComplete false without transfer
- PASS w1-s1 sessionComplete true with practice+transfer
- PASS w1-s1 sessionComplete false if one practice fails
- PASS w1-s2 toPublicSession strips hintRu
- PASS w1-s2 hintAvailable true
- PASS w1-s2 hintRu scaffold not cell dump
- PASS w1-s2 practice promptRu does not name exact edge figure
- PASS w1-s2 practice promptRu does not name shape word
- PASS w1-s2 practice count ≥ practiceRequired — 5 ≥ 4
- PASS w1-s2 has transfer
- PASS w1-s2 sessionComplete false without transfer
- PASS w1-s2 sessionComplete true with practice+transfer
- PASS w1-s2 sessionComplete false if one practice fails
- PASS w1-s3 toPublicSession strips hintRu
- PASS w1-s3 hintAvailable true
- PASS w1-s3 hintRu scaffold not cell dump
- PASS w1-s3 practice promptRu does not name exact edge figure
- PASS w1-s3 practice promptRu does not name shape word
- PASS w1-s3 practice count ≥ practiceRequired — 5 ≥ 4
- PASS w1-s3 has transfer
- PASS w1-s3 sessionComplete false without transfer
- PASS w1-s3 sessionComplete true with practice+transfer
- PASS w1-s3 sessionComplete false if one practice fails

## Content bugs / pedagogy smells

None detected by static checks (practice prompts do not name edge figures; hints lack cell dumps).

### Paid-hint figure words (allowed scaffold, noted for product risk)

- `w1s2-collision` hintRu mentions shape word (paid): «Большую фигуру лучше разбить на части и назвать лунки по номерам — одно слово «квадрат» мо…»
- `w1s2-p4` hintRu mentions shape word (paid): «Маленькая фигура из лунок — назови все четыре пары (ряд, столбец), а не одно слово «квадра…»

## Tasks good-child cannot pass

None — every task passed at least once (and all repeats if no flakes).

## Flakes

None.

## Residual product risks

1. Interpreter still LLM — temperature 0 reduces but does not eliminate flake on long cell lists.
2. Paid hints that name shapes (квадрат / диагональ / L) teach vocabulary shortcuts; OK if crystal-gated, leak if UI ever shows free.
3. Good-child scripts use explicit 1-based cell lists for hard shapes — real kids will underspecify; sessionComplete still requires transfer.
4. Collision tasks are not required for sessionComplete — child can skip collision pedagogy.
5. No sequence-world tasks in Week 1 — family coverage is grid-only.

## Attempt detail (failures only)
