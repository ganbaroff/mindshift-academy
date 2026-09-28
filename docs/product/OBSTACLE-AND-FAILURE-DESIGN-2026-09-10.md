# Obstacle and failure design — the grid walk

> Written 2026-09-10 on the owner's instruction to settle this himself-free ("продумай сам").
> Decides what happens when Mochi cannot carry out a child's instruction, and how that moment
> is drawn. Applies to the sequence-world family first, then to every family that has a
> visible consequence. Not yet built; this is the spec the visual rebuild designs against.

## The question

The owner's example: Mochi cannot see in the dark, the field has pits, the child gives
"three forward, two left, one forward, two right", and Mochi walks it. What happens when the
instruction is wrong? The owner's own instinct — "a pit is a pit, a bomb, Mochi dies, but I
cannot say that to a child, so we veil it" — is the right worry and the wrong solution. A veil
over a death is still a death, and children read it as one.

## The decision: Mochi stops, he never falls

**Mochi is never harmed, never lost, never destroyed. He reaches the step he cannot perform,
stops in front of it, and waits for a better instruction.**

This is not a euphemism. It is the truthful behaviour of a machine executing a literal
instruction, it is already how the engine behaves, and it is already the house rule:

> "The monster stops, it does not judge. Failure copy names what the monster could not do,
> never what the child got wrong." — `src/lib/tasks/sequence-world.ts`, header

So the obstacle is not a bomb or a pit. It is something Mochi **cannot cross**: a rock, a
stream, a fallen branch, a sleeping creature he will not wake. He halts at its edge. The
drama is "he is stuck and needs me", never "I killed him". A child who fears breaking the
companion stops experimenting, and experimenting is the entire learning mechanism.

### Rules that follow, and are not negotiable in later sprints

1. **No loss framing anywhere.** No lives, no timers, no "game over", no score going down.
2. **A wrong run costs nothing.** Crystals are spent on hints only. Being wrong must be free,
   instant and unlimited, or the child stops trying things. (Check against
   `src/content/curriculum/types.ts`: `HINT_CRYSTAL_COST`, `TASK_PASS_CRYSTAL_REWARD`.)
3. **Re-run is one tap** and always available from the stopped state.
4. **Mochi's mood at a stop is "thinking", never sad or hurt.** He is puzzled, not punished.

## How the failure moment is drawn

This is the highest-value new screen in the product and the reason the grid exists at all.
Today the same information is delivered as a form and a paragraph.

1. Mochi walks the child's list **one step at a time**, slowly enough to follow
   (~400–500 ms per step, honouring `prefers-reduced-motion` by stepping without easing).
2. At the failing step he **stops at the boundary**. He never stands on the hazard.
3. The step **in the child's list** that caused the stop is highlighted at the same moment.
   The link between "step 4 in my list" and "this spot on the map" is the whole lesson;
   without it the child sees a failure but not a cause.
4. The copy names what Mochi could not do, in his voice:
   «Мочи не смог шагнуть вперёд — там камень. Он ждёт.»
   Never «ты ошибся», never «неверно».
5. The child edits that one step and runs again. The list is not cleared.

## What the child actually learns, per tier

The owner's three candidate mechanics — "insert steps in order", "a rock he cannot pass",
"say it in words" — are not competing options. They are the existing three tiers, in order.

- **Tier 1 — the child taps ↑ ← → to build the list.** The field is visible. There is no
  ambiguity: Mochi does exactly what the list says. Learns: order, decomposition, and that a
  machine follows the list rather than the intention.
- **Tier 2 — part of the field is hidden, or the obstacle only blocks under a condition.**
  The child must reason "if the way is blocked, then…". Learns: conditions and branching.
  This is where the existing `rule-runner` vocabulary belongs.
- **Tier 3 — the buttons are gone. The child gives the instruction in words** and Mochi
  executes it literally. Learns: precision of language — the product's actual thesis.

The scaffold fades as the tier rises. This matches the ladder already enforced in
`TaskWorkspace.tsx` (worked example open → folded → absent).

## The one beat worth scripting deliberately

At tier 3, "три шага вперёд, потом налево" is ambiguous: left from Mochi's side, or from the
child's? Mochi turns from his own side and stops somewhere the child did not expect. Nothing
is broken, nothing is lost, and the child sees that an instruction which was perfectly clear
to them was ambiguous to him.

That is the single best teaching moment available in this design, and it should be an
authored beat in week 3 ("Мир коридора"), not an accident a child may or may not hit.

## Why this is not a Lightbot clone

Lightbot, Blockly Games, code.org's maze, Box Island and Cargo-Bot all teach planning against
a machine that understands perfectly; the difficulty is the path. Free ones exist and are
good. Our difficulty is that the machine understands **literally** and does something the
child did not mean. If the grid walk ever drifts into pure path-planning, we have built a
worse Lightbot with a monster skin. Tier 3 is what keeps us on our own thesis, so tier 3 is
not optional content.

## Cost, honestly

The engine is close to free: `src/lib/tasks/sequence-world.ts` is already a data-driven world
— action vocabulary, state counters, per-step requirements, per-step effects, deterministic,
stopping at the first impossible step. A grid maze is that engine with `{x, y, facing}` as the
counters and "the next cell is passable" as the requirement. What is missing is the renderer.

What is **not** cheap, and must not be underestimated: fifteen sessions of levels whose
difficulty genuinely escalates. Level curve is where every game of this genre earns its value.
The starting material is the existing ~1660 lines of session content under
`src/content/curriculum/`, which is a source for levels, not a blank page.
