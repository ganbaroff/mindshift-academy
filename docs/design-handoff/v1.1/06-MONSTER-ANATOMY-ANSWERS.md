# Answers — monster anatomy and growth rules

Answered 2026-08-07. Where an answer is a fact from the codebase rather than a preference, the
file and line is given, because those are not open to design.

## 1. Which part slots exist

Born with, on day one: **body, eyes, mouth** — plus the name, colour and emoji the child chooses
at hatching. Five **earned** slots, one per week, in this order:

1. **уши** — week 1, Точность
2. **руки** — week 2, Порядок
3. **рог** — week 3, Правило
4. **узор на спине** — week 4, Образец
5. **крылья** — week 5, Перенос

Order matters and is fixed: each part is placed further out and further back than the last, so
the silhouette keeps growing outward rather than rearranging.

## 2. Is a part tied to the week

**Hard-tied to the week**, and each part is the *proof of the skill*, not decoration: ears for
hearing precisely, hands for doing things in order, horn for holding a rule, back pattern for
repeating a pattern, wings for carrying a skill somewhere new. A child can say out loud why they
got it. Letting the child pick from 2-3 variants doubles the art and blurs the link between skill
and part — if we want choice later, give it as a colour or tint of the same part, not a different
part.

## 3. Body before the first part

**A complete creature, not a sketch.** This is a fact, not a preference: at onboarding the child
already hatches the monster and gives it a name, a colour and an emoji
(`prisma/schema.prisma` — `Monster.name/emoji/color`, all required, set on day one). Turning it
into an outline afterwards takes back something we already gave, and tells a child on their first
day that what they made is incomplete.

## 4. Can a grown part be lost

**Never. Growth is one-way.**

**But there is a contradiction in the product you must decide on, and the designer should know:**
the schema already carries `Monster.mood` with the comment *"Drops if user misses a day (Loss
Aversion)"*, and it is live — `src/app/api/cron/mood-decay/route.ts` runs nightly, lowers the
monster's mood for missed days, and warns the parent. That is exactly the streak-guilt the brief
promises we do not do. Either mood decay is retired, or we stop claiming no loss framing. It
matters more once the monster grows: a creature that gains parts *and* droops when you are away
turns growth into a stick. Recommendation: retire the decay, keep mood as a reaction to what
happens inside a session.

## 5. One monster or one per week

**One monster for the whole course.** Fact, already enforced: `Monster.userId @unique` —
one monster per child, one-to-one with the account.

## 6. Who draws the parts

**Placeholders now — simple geometry — real art later.** We have not yet put a growing monster in
front of a real child. If a new part does not read as a reward without explanation, the idea has
the same weakness the ranks had, and we would rather learn that from a grey triangle than from a
paid illustration.

## 7. Must parts differ without colour

**Yes — shape and position carry it, colour is secondary.** Cheap screens, colour blindness, and
our own audit rule that no meaning may rest on colour alone.

## 8. Does the monster react physically to a re-ask

**Yes, a small tilt — with two conditions.** It must be suppressed under
`prefers-reduced-motion` (already a shipped rule), and the meaning must survive without it: the
tilt is a bonus reading, never the signal. The signal is the words and the voice.

## 9. Does the parent see the monster

**Yes, compact, inside the weekly report.** It gives a parent something to talk about at home
that is not a score. Needs a second, smaller size — assume it will be rendered at roughly a
third of the child's size and next to text, not centred on a screen.

## 10. Final format for the parts

**SVG sprites per slot.** They scale, they can be tinted to the child's chosen colour, they cost
almost nothing to ship, and our stack already draws inline SVG. One file per slot, with the
anchor point documented.

## 11. What to build well first

**The other screens — re-ask, map, the stuck child. The monster can wait on placeholders.**

Reasoning: the monster is the reward, and we are not losing children at the reward. We are losing
them at a task they cannot understand and at a return visit that puts them back on step 1. Those
two are the measured defects. Growth can be improved forever; comprehension is a blocker.
