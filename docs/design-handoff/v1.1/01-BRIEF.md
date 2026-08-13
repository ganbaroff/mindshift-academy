# Brief — what the product is, what broke, where we think we should go

## 1. The product in one paragraph

MindShift Academy teaches children 8–11 to phrase instructions precisely. The child hatches a
digital monster and teaches it by writing instructions: to draw a shape, to build a plan in the
right order, to follow a rule, to copy a pattern, to prove it understood. The monster obeys
**literally**, so vague phrasing produces a visibly wrong result — that is the whole pedagogy.
Five weeks, three sessions each, fifteen sessions total. Free, invite-only, in closed pilot.

## 2. The two things that broke, reported by the founder using it himself

**A. The task does not say what a right answer looks like.**
Real task text: *«Скажи шаги для сэндвича в любом порядке»*. «Для сэндвича» can mean *make* one
or *assemble* one. «В любом порядке» contradicts a task that actually grades order. The child
spends their attention guessing the question instead of answering it.

**B. A returning child restarts from the beginning.**
He finished a session, came back the next day, and was on step 1 again. The cause is on our side
and we are fixing it in code regardless of design — but it tells you what the entry screen must
do: it must open on *where I am*, never on *the beginning*.

## 3. What two independent child-persona reviews found

- A fast child who does not read taps the first thing that looks tappable and never finds the
  hint, which sits behind a small footer icon and costs the reward currency.
- A careful child who fears being wrong quits after two failures in a row. Nothing in the system
  notices repeated failure or changes its behaviour.
- After any answer, the check button was replaced by a single "try again or continue" button
  that only moved forward — so "try again" silently meant "give up". Fixed now, but it shaped
  our rule below.

## 4. The direction we picked — and we want you to attack it

**Mission control.** The child is an operator; the monster is a robot on a mission.

**4.1 Every task states three things before the child touches anything.**

- **Цель** — what must exist when I'm done (one sentence, names the finished thing)
- **Что дано** — the exact list of what I have to work with
- **Готово, когда** — a condition the child can check for themselves

The sandwich task, rewritten:
> **Цель:** собрать сэндвич из того, что лежит на столе.
> **Что дано:** хлеб, сыр, масло, нож.
> **Готово, когда:** ты назвал 4 шага, и каждый следующий можно сделать только после предыдущего.

**4.2 The monster asks back instead of failing the child.**
When the instruction is ambiguous, the monster asks one clarifying question that quotes the
child's own words: *«ты сказал "намажь" — чем намазать?»*. This costs nothing, records no
attempt, and is not styled as an error. At most two questions per task, then the monster gives
its hint for free. Detection is deterministic code (verb with no object, pronoun with no
referent, order matters but no ordering words, and so on) — not a language model — so it is
instant, free and identical every time.

**4.3 A map, not a step counter.**
Fifteen mission dots in five clusters, one per week: Точность, Порядок, Правило, Образец,
Перенос. Done / current / locked. The app opens on the map, and the map is computed from what
the child actually finished.

**4.4 Ranks, not raw points.**
One rank per completed week. The existing gem currency stays and keeps exactly one job: buying
hints. We do not want a second economy.

**4.5 One law for the bottom bar.**
The check button is never replaced by another control. Skip appears *beside* it after a failure.
Passing swaps the pair for a single "next". We got this wrong once and a child could not answer
again in place.

## 5. What we are NOT asking for

- A new brand, a logo, or an illustration style guide.
- Anything that needs a framework, a build step, or a component library.
- Motion for its own sake. If you propose an animation, tell us what it teaches.

## 6. Where we are least sure — please push back

- Is "mission control" the right frame for an 8-year-old, or is it a grown-up's idea of fun?
  We also considered a workshop frame (each task is a part of the monster you are building) and
  a duel frame (score = how many times the monster misunderstood you).
- Is the three-field brief too much reading before the first tap? Would a child read it at all?
- Does the map help, or does it show a child how far they have *not* gone?
- Are ranks better than a visibly growing monster?
