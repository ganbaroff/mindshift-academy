# Spike: curriculum engine simulation

Purpose: **falsify the design in `docs/superpowers/specs/2026-07-27-thinking-curriculum-design.md`
before any product code is written.** Nothing here ships. It exists to answer three questions
with measurements instead of optimism.

## The questions

1. **Will a language model stay literal?** The design depends on the interpreter refusing to
   repair an incomplete instruction. A model's instinct is to be helpful. If it silently
   supplies the missing step, the child never sees the consequence of imprecise thinking and
   the whole course collapses back into the diktant it replaces.
2. **Do the executors produce a diff a child can learn from?** A bare "неверно" teaches
   nothing. The diff is the teaching material.
3. **What does it cost and how slow is it?** Per attempt, in tokens and milliseconds.

## The load-bearing invariant

**The interpreter never sees the target.** It receives only the child's words and the world
description. If it saw the target it would resolve ambiguity toward it, every child would
pass, and the measurement would be meaningless. `run-interpreter.mjs` enforces this: targets
live in the fixtures and are compared only after interpretation returns.

## Layout

```
lib/interpreter.mjs        prompt + provider call, returns a program or an underspecified verdict
lib/grid-draw.mjs          Week 1 executor + checker + child-readable diff
lib/sequence-world.mjs     Week 2 executor + checker + child-readable diff
lib/targets.mjs            seeded target generation per difficulty tier
fixtures/*.fixtures.mjs    childlike Russian inputs with expected literal outcomes
run-offline.mjs            executors only: no network, no key, proves determinism
run-interpreter.mjs        real provider: measures literalness, latency, tokens
```

## Running

```powershell
# Deterministic half. No key, no network.
node spikes/curriculum-engine/run-offline.mjs

# Model half. Reads a provider key from the environment.
$env:GEMINI_API_KEY = "..."      # or NVIDIA_API_KEY
node spikes/curriculum-engine/run-interpreter.mjs
```

## Reading the result

The literalness score is the share of fixtures where the model returned the **literal**
outcome. Repairs are counted separately from ordinary errors, because a repair is the failure
that kills the design while a parse error is merely a bug.

If literalness is low on a strong model, the design's pre-decided retreat applies: constrained
block-based input for the youngest tier instead of free text.
