# Design benchmark: children's STEM/learning apps (ages 6-11)

Scope: MindShift Academy task-screen/feedback/companion redesign research. Apps selected for public design material volume: **Khan Academy Kids, ScratchJr, Osmo, Kahoot! DragonBox, Prodigy Math, Kodable** (Lightbot used as a same-genre older-kid contrast case, not a full profile).

## Per-app patterns

### Khan Academy Kids (ages 2-5, Stanford GSE-advised)
- Instruction delivery: near-zero reading required; "games are clearly explained, and navigation options are clear and concise" via icon nav + animated demo, not paragraph text. [Common Sense Media]
- Feedback: adaptive selection, not drill — the app "automatically presents varied activities based on age and past performance" instead of explicit right/wrong loops. [CSM]
- Companion role: a character sits in the frame's corner on nearly every screen for the child to tap "if they get stuck," normalizing help-seeking rather than narrating content. [Getting Smart]
- Reward loop tied to presence, not mastery: completing an activity lets the child "choose a prize to add to their animal friends' collection" — a collection reward, not a score. [CSM]
- Session pacing: no timer; content free-rotates across math/ELA/logic/SEL games, videos, books for one continuous session. [CSM]
- Progress visualization: task layout "resembling a path" the child moves along, explicitly designed to generate "a sense of progress." [Getting Smart]
- Parent surface: deliberately light — CSM: "limited feedback to track progress, but not so much as to feel overwhelming." No heavy dashboard for this age band.

### ScratchJr (ages 5-7, MIT Media Lab / Tufts DevTech / Playful Invention Co.)
- Instruction delivery: blocks are "labelled with icons rather than words" *specifically* because the target users cannot read yet — icon-only was a deliberate research finding, not a style choice. [MIT Media Lab/Medium]
- Interaction grammar redesigned, not simplified: blocks snap **horizontally**, a departure from standard (vertical) Scratch, found to be both more toddler-friendly and better suited to small touchscreens. [MIT Media Lab]
- Companion role inverted: no guide mascot — the child animates *their own* created character, making agency itself the engagement mechanism.
- Reward loop: none score-based; the artifact (a shareable animated story) is the reward — no points/coins/stars.
- Parent/teacher surface: a printed/PDF curriculum guide for classroom use, not an in-app analytics panel. [scratchjr.org]
- UNVERIFIED: exact in-app voice-over presence — the fetched About page had no substantive detail; icon-first design strongly implies minimal/no voice-over but this is inferred, not directly confirmed by a primary source.

### Osmo (ages 3-12, Tangible Play — camera + physical manipulatives)
- Instruction delivery is hybrid-physical: a reflector-and-camera rig ("Reflective AI") recognizes tiles/letters/drawings; steps are shown via animation rather than read. [GamesBeat, playosmo.com]
- Feedback: strong audio+animation payoff on correct moves ("audio-visual rewards for correct answers"); recognition itself is reported as reliable enough to feel "frustration free." [Tech Age Kids, Women Love Tech]
- Companion role is per-game, not persistent: e.g., "Mo" in the drawing game "bring[s] drawings to life" — tied to one manipulative, not a cross-app guide.
- Reward loop rewards the *physical act* as much as correctness — explicit founder design goal was countering passive "digital zombie" screen time. [GamesBeat interview, Pramod Sharma]
- Parent surface gap, named directly by reviewers: Osmo "could do with a little more built-in help and links to tutorial videos" — the adult typically must pre-learn the game before handing it over. [Tech Age Kids]
- UNVERIFIED: whether current Osmo software ships an online parent dashboard — not found on the fetched homepage.

### Kahoot! DragonBox (Numbers/Algebra/Geometry/Multiplication, Kahoot-owned)
- Pedagogical spine publicized directly: a 4-stage "DragonBox Method" — Engage → Explore → Reflect → Apply — used across the whole product line. [kahoot.com]
- Instruction via visual metaphor, not symbols: "Nooms" characters stand in for numbers so kids manipulate concrete objects instead of reading digits. [kahoot.com]
- Feedback speed is a named design goal: manipulation gives "instant feedback," explicitly contrasted with classroom delay.
- Character variety over one mascot: the multiplication app uses 20+ mini-games with different "memorable characters through storytelling" rather than a single companion. [Kahoot press release]
- Session pacing control absent elsewhere in this set: free tier caps at "five challenges per day"; subscription unlocks "unlimited daily playtime." [Kahoot press release]
- Parent surface substituted by a safety claim, not analytics: marketing leads with "no ads or in-app purchases... no distractions" rather than a dashboard. [kahoot.com]
- UNVERIFIED: exact wrong-answer copy/animation — not shown on fetched marketing pages.

### Prodigy Math (ages ~6-14, freemium; cautionary case)
- Instruction delivery: text-heavy UI; CSM flags that even with an intro guide, "sometimes next steps are not obvious."
- Feedback: correct answers earn spells/coins driving battle progression; CSM explicitly flags "limited feedback for incorrect answers" — wrong answers are a near dead-end.
- Companion role is front-loaded only: a "friendly creature" walks the player through first-run screens, then disappears from the loop.
- Reward loop decoupled from mastery — the headline risk in this set: CSM says "the math part of the game is an afterthought" next to pet/currency collecting; child-advocacy group Fairplay for Kids adds that "marketing prompts appear mid-lesson," further diluting the loop.
- Session pacing: none built in; parent reviewers self-impose "20-30 minute" caps because the game has no natural stop point.
- Parent surface exists but is thin by its own users' account: separate "Prodigy Parent" app supports goal-setting and sending in-game rewards/cheers, but a reviewer says they "can't do any child management from this app other than setting question goals." [CSM, Trustpilot via search synthesis]

### Kodable (ages ~4-10; contrast: Lightbot, ages 10+)
- Instruction delivery: each new programming concept opens with a short **video tutorial**, not static text — video-first, not icon- or paragraph-first. [CSM]
- Failure handling is explicitly zero-penalty: "failed attempts can be redone," versus Lightbot's harsher, older-audience stance of "no hints or clues are offered." [CSM, both reviews]
- Companion/narrative role: the "Fuzz family" wraps abstract logic (loops, conditionals, sequencing) in a space-adventure story.
- Reward loop: strictly linear level-unlock tied to completion — simpler and more mastery-adjacent than Prodigy's currency loop.
- Parent surface is the standout, named directly by CSM: "tons of materials for parents and teachers," a printed curriculum, and **off-screen** paper-based logic games — a deliberately non-dashboard parent product.
- Age-band contrast (Lightbot): terse on-screen text ("what you need to know when you need to know it"), fast difficulty ramp, and star-rating tied to code *efficiency* not just completion — same genre, opposite tone, six years apart in target age.

## What ages 8-11 need that adult platforms don't give
(compared against sibling research on Coursera/Udemy/Codecademy and Duolingo/Brilliant)
1. Non-reading-dependent instruction (icon/video/manipulative-first) — ScratchJr's icon-only blocks, Osmo's manipulatives — vs. adult platforms' dense paragraph instructions.
2. A visible, explicitly zero-penalty retry — Kodable's "redo," Lightbot's parent guidance to "stress... there's no penalty for trying and failing" — vs. adult platforms showing a raw score with no reassurance layer.
3. A persistent companion for emotional scaffolding, not just content delivery — Khan Academy Kids' tap-if-stuck character normalizes "I'm stuck," which adult UIs have no equivalent of.
4. Externally imposed pacing, because children won't self-regulate — DragonBox's daily cap; parents self-imposing 20-30 min limits on Prodigy — vs. adult platforms leaving session length entirely to the learner.
5. Reward loops need explicit mastery-tethering or they visibly rot the pedagogy — Prodigy is the flagged cautionary case (CSM, Learning Standard, and child-advocacy group Fairplay for Kids all converge on this critique); adult-platform critique rarely raises this failure mode since adults are assumed intrinsically motivated.
6. A parent-facing surface that is a *distinct product*, not an admin panel bolted onto the child's UI — Kodable's printed curriculum/off-screen games vs. Prodigy Parent's own users calling it functionally thin.
7. Physical/tangible interaction as a legitimate design tier — Osmo's whole premise is that screen-only feedback under-serves fine-motor/attention needs at this age; no adult platform in this research uses a physical peripheral.
8. Explicit sub-tiering within one age band — Kodable (4-10) vs. Lightbot (10+), Tynker vs. Tynker Junior, Khan Academy Kids (2-5) vs. Khan Academy proper — none of the benchmarked apps span 8-11 with one undifferentiated UI, unlike adult platforms which treat "adult" as one audience.

## Recommendations for MindShift (screen/component-named)
1. **Session intro screen**: cut to one icon/animated demo + ≤1 short sentence, goal line first (already shipped, commit `0239d11`) — model on ScratchJr/Khan Academy Kids, not paragraph instructions.
2. **Task screen**: for grid-draw/rule-runner/pattern-expand, show one worked example inline as the instruction (DragonBox/Osmo manipulative-metaphor pattern) instead of describing the mechanic in prose — matches the non-fluent-reader band ScratchJr/Kodable both target.
3. **Feedback-fail screen**: adopt Kodable's explicit zero-penalty framing ("try again," instant redo, no visible score drop) rather than generic fail copy; since MindShift's judge is deterministic, it can name *which part* of the attempt failed — a concrete win Prodigy is criticized for lacking entirely.
4. **Task screen + companion**: the monster currently reacts only at thinking/pass states (commits `e3ffd46`, `0c7b0a4`) — add a standing tap-for-help affordance during the task itself, copying Khan Academy Kids' always-present help character, since KAK's rationale is specifically reducing stuck-and-quit moments.
5. **Map / session-complete screen**: overlay Khan Academy Kids' path-metaphor progress visualization onto the existing week themes (commit `7e77063`) rather than a flat skin — KAK's stated design goal is generating "a sense of progress that encourages the student to keep going."
6. **Parent dashboard**: do not copy Prodigy Parent's thin in-app-only model (criticized by its own users). Follow Kodable's off-app-loop pattern instead: keep the weekly email (per `AGENTS.md`) and add one mastery-tethered line — "what your child struggled with this week," sourced directly from the judge's failure categories — the exact signal Prodigy's reviewers say it lacks.

## Sources
- Common Sense Media: [Prodigy](https://www.commonsensemedia.org/app-reviews/prodigy-kids-math-game), [Kodable](https://www.commonsensemedia.org/app-reviews/kodable), [Lightbot](https://www.commonsensemedia.org/app-reviews/lightbot-programming-puzzles), [Khan Academy Kids](https://www.commonsensemedia.org/app-reviews/khan-academy-kids), [coding apps roundup](https://www.commonsensemedia.org/blog/cool-tools-to-help-kids-learn-to-code)
- [Getting Smart — user design and K-12 engagement (Khan Academy Kids)](https://www.gettingsmart.com/2019/04/07/how-user-design-can-impact-engagement-and-learning-for-k-12-students/)
- [MIT Media Lab — ScratchJr / Scratch+Google interface research](https://medium.com/mit-media-lab/scratch-google-next-generation-of-programming-blocks-for-kids-5f377ec9ff0), [ScratchJr About](https://www.scratchjr.org/about/info), [Tufts Now](https://now.tufts.edu/2014/07/30/scratchjr-coding-kindergarten)
- [GamesBeat — Osmo/Tangible Play](https://gamesbeat.com/tangible-plays-osmo-opens-up-new-ways-for-kids-to-play-with-an-ipad/), [Tech Age Kids review](https://www.techagekids.com/2016/11/osmo-educational-gaming-system-for-ipad.html), [PlayOsmo](https://www.playosmo.com/en-us/), [Women Love Tech](https://womenlovetech.com/make-learning-fun-with-digital-play-for-kids-using-osmo/)
- [Kahoot! DragonBox](https://kahoot.com/home/learning-apps/dragonbox/), [Kahoot Multiplication by DragonBox press release](https://kahoot.com/press/2022/02/17/kahoot-multiplication-by-dragonbox/)
- Prodigy parent-app sentiment: MWM, Trustpilot, The Learning Standard, Fairplay for Kids critique (aggregated via search synthesis, no single fetched primary URL for the advocacy critique — treat as secondary-sourced)

## UNVERIFIED
- ScratchJr in-app voice-over presence/absence — inferred from icon-first design philosophy, not directly confirmed by a fetched primary page.
- Osmo's current online parent-dashboard existence — not found on the fetched homepage; may exist on a sub-page not fetched in this pass.
- DragonBox exact wrong-answer copy/animation — not shown on fetched marketing pages; would require in-app capture to confirm.
- Fairplay for Kids critique of Prodigy — relayed via a secondary review's citation, not fetched from Fairplay for Kids' own site directly.
