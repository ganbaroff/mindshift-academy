# MindShift Academy — design handoff v1.1

Hello. You are being asked to **think with us, not to execute a spec**. Read `01-BRIEF.md`
first, then `02-CURRENT-STATE.md`, then look at the real content in `04-SAMPLE-TASKS.json`.

## What we want back, in this order of importance

1. **Your opinion, in writing, before any code.** Where is our thinking wrong? What would you
   cut? What are we solving with UI that should be solved with content, or the other way round?
   If you think our chosen direction is a mistake, say so and say what you would do instead —
   we would rather lose the idea than lose a child's first session. One page is enough.
2. **A static mockup**: one `.html` file, inline CSS, vanilla JS, no framework, no build, no
   external requests. All copy in one JS object at the top so we can swap text without touching
   markup. We will re-implement it in React ourselves — we are not importing the file, we are
   arguing with it and then rebuilding it, so structure it for reading.
3. **The four states** listed in the brief, reachable from a debug row at the top of the mock.
4. **Anything you noticed that we did not ask about.** Naming, tone, rhythm, what a tired
   9-year-old does at 8pm — you will see things we cannot.

## Ground rules

- The real users are children 8-14 on cheap Android phones. 320px wide is a real device, not an
  edge case.
- Russian interface. Some families are Azerbaijani-speaking at home.
- No dark patterns, no streak guilt, no countdown timers, no loss framing. This product is used
  by children whose parents gave consent under a strict privacy regime.
- Nothing may require hover. Nothing may require drag as the only path.
- We will ask you to justify any animation.

## Files in this package

| File | What it is |
|---|---|
| `01-BRIEF.md` | The problem, the users, the direction we picked and why — and what we want you to challenge |
| `02-CURRENT-STATE.md` | What the product looks like today, honestly, including what is broken |
| `03-TOKENS.css` | The exact colours and type scale in production right now |
| `04-SAMPLE-TASKS.json` | Real task content and real monster feedback, verbatim from the codebase |
| `05-QUESTIONS-FOR-YOU.md` | The specific decisions we are unsure about |

Nothing in this package is confidential — no keys, no user data, no parent or child information.
