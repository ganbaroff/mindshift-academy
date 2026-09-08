# Brief: the child's screen should behave like an app, not a page

> To the design agent. From the Opus agent in the Claude Code harness.
> Repo state: `owner/sprint-3` @ `c561f70`. `npm test` and `npm run build` exit 0.
> Every number below was measured on the running app at 390×844 on 2026-09-08, not estimated.

---

## 1. The measurement that defines the job

Session `w1-s1`, task 2, clean state (nothing expanded, no feedback on screen), viewport 390×844:

| What | Measured | Target |
|---|---|---|
| Document height | 1994 px (2.4 screens) | — |
| **Distance to the first thing a child can touch** | **760 px — 0.9 of a screen** | **0** |
| **Text blocks above the board** | **10** | **≤2** (your own gate S1) |
| Tap targets on screen | 27, one below 44 px (smallest 36 px) | 0 below 44 px |

The ten blocks, in the order a child meets them: «ЗАДАНИЕ 2 ИЗ 7» · «Неделя 1, сессия 1 · Мир
слуха» · «Мир слуха» again · «Монстр слышит только то, что сказано» · the goal sentence ·
«ЦЕЛЬ — СОВПАСТЬ С ЭТОЙ КАРТИНКОЙ» · the target grid · «дом 4×4 окна» · «картинка-цель» ·
«слова: столбец, левый, правый».

So the defect is not length. 2.4 screens is fine. The defect is that **the child reads for a
full screen before they are allowed to do anything.** Duolingo's real trick is not cards or a
green owl — it is that the interactive element is above the fold on every single screen, and
everything explanatory is either gone or one tap away. That is the whole brief.

## 2. What the owner asked for, in his words

A mobile app, not a web page. Duolingo-format: a question appears, you answer, you move on.
Cards. A hint ladder that gets easier step by step. A different arrangement from desktop. He has
been explicit that the current screen does not feel like this, and the measurement says he is
right.

## 3. My recommendation, which you may argue with

**Do not design a new product.** Design a new *shell* for the child surface only. Four things in
this repository are already right and a from-scratch redesign would lose them:

- `/map` — the monster grows, one large «Продолжить», three stops, future weeks as a sentence
  instead of a chain of locks. Deliberately not Duolingo's endless path, and correct for us.
- The tier ladder — level 3 removes the worked example rather than adding a hint. Real difficulty.
- The brief contract — goal, what you have, «получится, когда», all visible before the first
  attempt. This was argued for once already and should not be re-litigated.
- Mochi and her four one-shot faces, first-party and settling on a rest frame.

What must change is the *arrangement*: one thing per screen, the interactive element first,
everything else behind a tap.

## 4. Deliverables

### 4.1 The task screen, mobile (390×844 is the design surface; 320 px must not break)

Design the child's task as a **card that fills the viewport with no scrolling in the resting
state**. Constraints, all machine-checkable:

- The interactive element (board, chips, choices) is **visible without scrolling**. This is the
  760 px from §1 going to zero, and it is the point of the whole exercise.
- **At most two text blocks above it**: the goal, and one line in the monster's voice. Everything
  else — «что дано», «Коротко», the worked example, «Уровень», the explanation — sits behind a
  single tap or below the fold, never above it.
- The primary action stays reachable with one thumb at the bottom.
- Progress reads as position, never as a number that can fall.

### 4.2 Desktop is a different arrangement, not a stretched phone

Say plainly what changes above ~900 px: the explanation may live permanently in a side column,
the board can be larger, the sticky bar can become inline. Same components, different
composition. Give both layouts for the same task.

### 4.3 The hint ladder as three rungs

The owner asked for hints that get progressively easier. The server already knows when a child is
stuck from `TaskAttempt` rows (`src/lib/tasks/stuck.ts`), and after two recorded misses the hint
becomes free — that logic exists and must not be rebuilt. Design the three rungs:

1. how to say it — free, offered after the first miss. Offered, never opened by itself.
2. what the monster actually heard — free, after the second.
3. what I would do, confirm it or change one thing — costs crystals, only if the child asks.

Check the economics before pricing rung 3: a hint costs 5 crystals, a passed task pays 3, the
starting balance is 15. As it stands a child can buy three hints in a course of 60–90 tasks. Say
whether that is intended or a bug — it changes rung 3 completely.

### 4.4 The feedback card

Two defects, both photographed at 390 px, both yours:

- The ASCII diff wraps. «Я закрасил так:        А просили так:» breaks so «А» lands on the line
  below «просили так:», and the two boards stop reading as two columns exactly where a child needs
  them to. Your §8.4 — two labelled graphical boards, ASCII kept as the pure function's default —
  is the agreed shape. Draw it.
- The monster's words and the board comparison arrive as one undifferentiated block.

### 4.5 The states nobody has designed

Empty, loading, offline, error. The child currently sees the English word `Unauthorized` when an
API call fails — I saw it on screen. Each of these needs a Russian screen in Mochi's voice.

## 5. Rules that do not move

- 8–11 years old. 320 px is a real device. Nothing may require hover, or drag as the only path.
- Russian only on the child's surface. No English word ever reaches a child.
- Colours come from `globals.css` through `var()`. `tests/design-tokens.test.mjs` fails the build
  on a raw hex or a Tailwind default-palette class, with a two-sided ratchet — do not hand back
  markup containing `violet-500`.
- Motion: one-shot, self-settling, ≤3 cycles, readable first and last frame, and a reduced-motion
  branch that still communicates. `--ease-out`, `--ease-in-out` and `--duration-press` are the only
  curves and durations; a new one is a decision, not a detail.
- Nothing the child has earned is ever taken away, and absence is never punished.

## 6. How this will be judged

Not by looking at a mockup. By four numbers, measured on the running app at 390×844:
distance-to-first-interactive = 0, text blocks above it ≤ 2, zero tap targets under 44 px, and a
child returning after 21 days sees a byte-identical screen. I will measure all four and send you
the results.

## 7. What I could not check

Whether any of this is what an eight-year-old actually wants. No child has used the product. The
numbers here describe the screen, not the child, and they cannot tell you whether the course
teaches anything.
