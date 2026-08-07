# Current state — what the screen looks like today, honestly

Written from the live production code, not from wishes. Where something is broken, it says so.

## The learning screen today, top to bottom

1. **Sticky header** — back link, a truncated progress label, a row of small numbered pills, one
   per task in the session. The pills are inert `<span>`s: they show state but you cannot tap
   back to an earlier task.
2. **Goal picture** (for drawing tasks) — a small coloured grid showing the target shape. It is
   always visible; hiding it during "collision" tasks made the task impossible for children.
3. **Task prompt** — one paragraph of text. This is where the ambiguity problem lives: it is
   free prose, with no required structure.
4. **Workspace** — differs by task family: a 4x4 tappable grid, an ordered step list, a rule
   builder, a pattern surface, a claim surface.
5. **Monster feedback** — appears after an answer, in the monster's voice.
6. **A collapsible free-text box** — "сказать своими словами", always available as a fallback.
7. **Sticky bottom bar** — hint button (costs 5 gems, and a pass earns 3, so a hint costs more
   than the task pays) and the primary check button.

## What already works and should be kept

- The monster's feedback names specifics rather than judging: it lists which cells it did not
  hear about and which it filled in because it understood you that way.
- Nothing shaming anywhere. The words "wrong", "failed", "you made a mistake" are banned by an
  automated check.
- The target picture always visible.
- The child's own selections survive a retry — the workspace is not wiped.
- Everything is keyboard reachable; nothing is drag-only.

## What is broken or weak today

- **Task prompts have no required structure** (the main reason for this brief).
- **Hints are punished.** The hint costs 5 gems, a passed task pays 3, and the hint button is a
  small icon in the footer that a child must notice and choose. A stuck child either does not
  find it or cannot afford it.
- **Nothing reacts to repeated failure.** There is an idle nudge on a timer, but a child who keeps
  tapping never idles, so it never fires for the child who needs it most.
- **The progress pills do not navigate.**
- **One week's tasks are unsolvable as written**: three of four required tasks say "insert the
  missing step into the plan" while the board starts empty — there is no plan to insert into.
- **Code entry boxes are 30px wide** on a 320px screen, under the 44px minimum, and that is the
  one control an unsupervised child must use to get in.

## Numbers you should design against

- Time to first meaningful action should be under 10 seconds from opening the app.
- A session is 4-6 tasks and should take 10-15 minutes.
- Page weight today is around 550-600KB on a marketing page — assume a slow connection.
- Base font is 16px. The current design has 41 text nodes under that on the home page; we do not
  want more.

## Constraints that come from law, not taste

This product operates under verified parental consent. A child's typed text does not leave our
servers until a parent has confirmed. That has design consequences you should know about:

- We cannot add "share your drawing", "invite a friend", leaderboards between children, or any
  social surface.
- We cannot show a child's name to anyone but their own parent.
- No advertising, no upsell, no third-party analytics on child screens.
- Any celebration must be self-contained: the child and their monster, nobody else.
