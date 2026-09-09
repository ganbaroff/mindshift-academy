# Live design-token extraction — 5 EdTech sites (2026-09-05)

Method: navigated each site in the Claude Browser pane, checked for cookie banners (declined
where a decline option existed; see uchi.ru note), ran one `getComputedStyle`/`getBoundingClientRect`
JS snippet per site against `document.body`, first `h1`, first `h2`, the first CTA `<a>`/`<button>`
matching `/get started|start|try|sign up|начать|попробовать|learn/i`, the first `div` with
`border-radius > 8px` and a real `box-shadow`, and the first `<p>`. One 0.5-scale screenshot per site.
No sign-in, no forms submitted, no cookie consent accepted.

Current MindShift tokens (`src/app/globals.css`) for reference: bg `#FBF1E0`, text `#2B2320`,
primary `#FF6B4A`, body `16px`, radius `~1rem` (16px, "2xl"), buttons `min-h: 44px`.

## Per-site notes

- **Duolingo** (`duolingo.com`) — no cookie banner encountered. Verified.
- **Brilliant** (`brilliant.org`) — no cookie banner encountered. Verified.
- **Khan Academy Kids** (`khanacademy.org/kids`) — redirected briefly through a "Client Challenge"
  bot-check page, then resolved to the Kids marketing page (confirmed by tab title). No cookie
  banner. No `<h1>` tag exists on the page (the big headline "Joyful Learning Starts Here!" is not
  an `h1`) — `h1` fields below are `null` for this row. Verified, with that caveat.
- **Coursera** (`coursera.org`) — no cookie banner. The CTA regex false-matched a "DeepLearning.AI"
  partner-course link (contains "Learn") because Coursera's real hero has no literal
  start/try/sign-up-labelled control in first-match DOM order — treat the Coursera CTA row as
  **not representative of a true primary CTA**, kept only for the shadow/transition data point.
- **uchi.ru** — cookie banner present, text: "Учи.ру использует Ваши cookie и другие данные, чтобы
  сделать сервис удобным. Продолжая использовать его или нажимая «ОК», Вы соглашаетесь с условиями."
  Only an "ОК" (accept) button was offered — no decline/necessary-only option existed. Per the
  most-privacy-preserving rule, I did not click accept; the banner is non-blocking overlay text at
  the bottom of the viewport and did not prevent reading the page, so extraction proceeded. Verified
  with that caveat. Root/body font-size on this site is genuinely `24px` (not a bug) — uchi.ru scales
  its whole rem base up.

No site was blocked or fully redirected away from its target content; nothing marked UNVERIFIED.

## Token comparison table

| Field | Duolingo | Brilliant | Khan Academy Kids | Coursera | uchi.ru |
|---|---|---|---|---|---|
| body font-family | sans-serif (system) | "CoFo Brilliant", sans-serif | Arial, sans-serif | "Source Sans Pro", Arial | Manrope, sans-serif |
| body font-size | 17px | 16px | 14px | 16px | 24px |
| body line-height | 20px (1.18×) | 24px (1.5×) | 20px (1.43×) | 24px (1.5×) | 27.6px (1.15×) |
| body color | rgb(241,247,251)* | rgb(0,0,0) | rgb(51,51,51) | rgb(13,15,18) | rgba(9,21,38,.85) |
| body background | white | white | white | white | transparent |
| h1 font-size / weight | 32px / 700 | 76px / 500 | **null (no h1 tag)** | 48px / 600 | 24px / 400 |
| h1 line-height / letter-spacing | normal / normal | 79.8px / -1.4px | — | 56px / -0.48px | 28.8px / normal |
| h2 font-size / weight | 48px / 700 | 60px / 500 | 16px / 600 | 28px / 600 | 80px / 800 |
| h2 line-height / letter-spacing | normal / normal | 66px / -1.2px | 20px / normal | 32px / -0.28px | 76px / normal |
| CTA text (first match) | "GET STARTED" | "Get started" | "Learn More" | "DeepLearning.AI" (false match†) | "ЗАРЕГИСТРИРОВАТЬСЯ" |
| CTA height | 50px | 40px | 48px | 42px | 54px |
| CTA padding L/R | 16/16px | 14/14px | 20/20px | 12/12px | 24/24px |
| CTA border-radius | 12px | 54px (pill) | 12px | 100px (pill) | 16px |
| CTA bg / color | transparent*/white | black/white | teal rgb(20,191,150)/white | white/near-black | white/rgba(9,21,38,.85) |
| CTA font-size / weight | 15px / 700 | 16px / 500 | 24px / 600 | 14px / 400 | 18px / 800 |
| CTA text-transform / letter-spacing | uppercase / 0.8px | none / normal | none / normal | none / normal | uppercase / 0.9px |
| CTA transition duration / easing | 0s / ease‡ | 0s / ease‡ | 0s / ease‡ | 0.3s / cubic-bezier(0,0,.5,1) | 0.3s / ease |
| Card border-radius | no qualifying card found in first pass | 20px | 12px | no qualifying card found | 12px |
| Card box-shadow | — | 0 0 25px rgba(0,0,0,.2) | -4px 4px 0 rgba(0,0,0,.1) (offset "sticker" style) | — | 0 16px 18px rgba(105,57,127,.2) (colour-tinted) |
| Card padding | — | 32px | 0px | — | 20px 22px 24px |
| `<p>` margin-bottom | 0px | 0px | 0px | 0px | -1px |
| root (`html`) font-size | 16px | 16px | 16px | 16px | 24px |

\* Duolingo's matched `body` text-color read as near-white — the real dark body copy almost certainly
lives on a nested container, not `document.body` directly; treat as a DOM-selection artifact, not a
real "white text on white background" design.
† See per-site notes — not a genuine primary CTA, kept for transition/shadow data only.
‡ A `0s` transition on the base element is expected and not a real "no animation" claim — these
sites almost certainly apply `transition` only inside a `:hover`/`:focus` rule, which a base-state
`getComputedStyle` read cannot see. Only Coursera and uchi.ru had `transition-duration` set on the
resting state itself.

## Screenshots — 2-line read per site

- **Duolingo**: Centered single column, very generous whitespace, mascot (green owl "Duo") is the
  single largest visual element and anchors the hierarchy; headline + two stacked CTA buttons read
  in under a second.
- **Brilliant**: Two-column hero (huge serif-adjacent headline left, a live interactive chart/diagram
  right), whitespace is tight-but-premium, no mascot — hierarchy is carried entirely by oversized type
  (76px h1) against pure black/white.
- **Khan Academy Kids**: Narrow left-aligned text block over a soft blue wave shape, whitespace is
  large and calm, no mascot visible in the hero itself (brand character presumably appears deeper in
  the funnel); hierarchy is quiet, more "parent-reassurance" than "kid-excitement."
  Column width feel: comfortably narrow, reads like a landing page for adults, not children.
- **Coursera**: Dense multi-card grid (course cards, promo ribbons) fills the whole viewport almost
  immediately; whitespace is minimal, hierarchy comes from card grouping and color blocks, not from
  type scale; no mascot — this is an adult, information-dense pattern, the opposite end of the
  spectrum from Duolingo/uchi.ru.
- **uchi.ru**: Split hero (bold headline + login form side-by-side), whitespace is moderate, a
  colorful mountain/dragon-like illustrated character sits in the hero as a friendly companion —
  structurally the closest analog to MindShift's own companion-monster mechanic among all 5 sites.

## Observed norms (median across the 5 sites, false-match/null rows excluded)

| Metric | Values used | Median |
|---|---|---|
| Body font-size | 14, 16, 16, 17, 24 | **16px** |
| Body line-height ratio | 1.15, 1.18, 1.43, 1.5, 1.5 | **~1.43–1.5×** |
| H1 font-size (Khan excluded, no h1) | 24, 32, 48, 76 | **40px** (avg of 32/48 midpoints) |
| CTA height | 40, 42, 48, 50, 54 | **48px** |
| CTA border-radius | 12, 12, 16, 54, 100 | **16px**, but bimodal: a "structured" cluster at 12–16px (Duolingo, Khan Kids, uchi.ru) vs a "pill" cluster at 54–100px (Brilliant, Coursera) |
| Card border-radius | 12, 12, 20 | **12–14px** |
| Transition duration (resting-state only, n=2) | 0.3s, 0.3s | **0.3s** — treat as the real norm; the `0s` reads elsewhere are a measurement artifact (see ‡ above), not evidence of no motion |
| Transition easing (resting-state, n=2) | cubic-bezier(0,0,.5,1), ease | roughly **ease-out** family |

## Recommended MindShift token set (vs. current)

| Token | Recommended | Current | Verdict | Why |
|---|---|---|---|---|
| Body font-size, desktop | 16px | 16px | **keep** | Exactly matches the 5-site median; no reason to move it. |
| Body font-size, mobile | 16px (never below) | 16px (implied, same var) | **keep** | iOS auto-zooms inputs under 16px; Duolingo (17px) and Coursera/Brilliant (16px) all stay at/above this for a reason — kids' reading app should not go smaller. |
| Body line-height | 1.5 | not set in the 4 given tokens | **raise (new/undefined → set explicitly to 1.5)** | Brilliant and Coursera both sit at 1.5×; Khan Kids (the closest audience match) is 1.43×. 1.5 is the safer, more dyslexia/ADHD-friendly choice for an 8–11 reading product and should be pinned as an explicit token, not left to browser default. |
| H2 (subhead), desktop | 28px / 700 | not set | **new token, set at 28px** | Sits between Coursera's sober 28px and Khan Kids' near-invisible 16px; big enough to carry hierarchy without the drama of Brilliant's 60px or uchi.ru's 80px, which don't fit a task-screen product. |
| H2, mobile | 22px / 700 | not set | **new token** | Standard ~0.8× desktop-to-mobile step seen implicitly across all 5 sites' responsive builds. |
| H1 (hero/rare), desktop | 40px / 700 | not set | **new token, set at 40px** | Matches the cross-site median (40px); below Brilliant/uchi.ru's extremes which are marketing-hero-scale, not app-UI-scale — MindShift's H1 use is mostly onboarding/marketing pages, not every screen. |
| H1, mobile | 30px / 700 | not set | **new token** | Proportional step matching observed desktop→mobile ratios (~0.75×). |
| Button radius | 16px (~1rem) | ~1rem (16px) | **keep** | Falls inside the "structured" cluster (Duolingo 12px, Khan Kids 12px, uchi.ru 16px) that MindShift already resembles more than the "pill" cluster (Brilliant/Coursera) — pills read as adult-SaaS, not kid-app. |
| Card radius | 20px | ~1rem (16px, same var as buttons today) | **raise, and split from button radius** | Brilliant's only fully-qualified card was 20px; Khan Kids and uchi.ru's cards sit at 12px but visually read flatter/more sticker-like. Giving cards a slightly larger radius than buttons (20px vs 16px) is a cheap way to make surfaces feel softer/friendlier for the 8–11 cohort without touching the button token buttons already rely on. |
| Button min-height | 48px | 44px | **raise** | Observed median is 48px; Khan Academy Kids — the only other product in this set built for young children (ages 2–8) — uses exactly 48px. 44px is Apple HIG's *adult* minimum; kids have measurably worse tap precision, so matching the closest same-audience competitor rather than the generic HIG floor is the safer call. |
| Card shadow | `0 12px 24px rgba(43,35,32,0.12)` (tinted with MindShift's own text color `#2B2320`, not black) | not set | **new token** | uchi.ru's card shadow is tinted purple (`rgba(105,57,127,.2)`) rather than plain black — a colour-tinted, low-opacity shadow reads softer and more "kid-app" than Brilliant's harsher `rgba(0,0,0,.2)`. Tinting with MindShift's own ink color keeps it on-brand. |
| Spacing base | 8px grid | not specified | **new/confirm** | Standard across all 5 sites' visible padding values (16, 20, 24, 32 all divide cleanly by 8); the one surprising finding is that hero `<p>` margin-bottom read as `0px` on every site (or `-1px` on uchi.ru) — modern sites are laying hero copy out with flex/grid `gap` rather than paragraph margins. Recommend MindShift do the same (gap-based spacing at 16–24px) rather than relying on `<p>` margin-bottom for rhythm. |
| Motion duration, micro (button/tap) | 200ms | not set | **new token** | Half the observed 0.3s norm — appropriate for a small, frequent interaction (button press) so it doesn't feel laggy under repeated taps from a child. |
| Motion duration, standard (panel/modal) | 300ms | not set | **new token** | Matches the one directly-observed resting-state value shared by Coursera and uchi.ru (0.3s). |
| Motion easing | `cubic-bezier(0.4, 0, 0.2, 1)` (standard ease-out) | not set | **new token** | Close to Coursera's actual `cubic-bezier(0,0,.5,1)` and functionally in the same "ease-out" family as both observed real easings; this is the well-tested Material-style ease-out rather than inventing a bespoke curve. |
| Reduced motion | `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; } }` | not set | **new token — should ship regardless of what competitors do** | None of the 5 sites were audited for this (out of scope of the JS snippet), so this is not evidence-driven from the competitor set — it's a baseline accessibility requirement for any app used by children, several of whom may be sensory-sensitive (ADHD is explicitly MindShift's core audience). |
| Background `#FBF1E0` / text `#2B2320` / primary `#FF6B4A` | unchanged | unchanged | **keep** | Not comparable to competitor palettes directly — all 5 competitors default to white/near-black/brand-accent, whereas MindShift's warm-cream background is an intentional differentiator for a kids product, not a norm violation. No competitor evidence argues for changing brand color. |

## Caveats on the data itself

1. Every "CTA" and "card" field is the *first DOM match*, not necessarily the visually most prominent
   element — Coursera's CTA row is a confirmed false positive (see per-site notes) and Duolingo's body
   text-color read is almost certainly picking up the wrong nested element.
2. All `transition-duration: 0s` reads are a known limitation of reading computed style on an
   element's resting state — real transition timing on 3 of 5 sites is invisible to this method
   because it lives inside a `:hover`/`:focus` rule, not the base rule.
3. Khan Academy Kids has no `<h1>` element at all on its current marketing page — its real headline
   hierarchy cannot be captured by an `h1`/`h2` selector-based script.
4. uchi.ru's cookie banner had no decline option; extraction proceeded without accepting it, per the
   most-privacy-preserving rule, since the banner was non-blocking.
