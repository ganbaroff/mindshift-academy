/**
 * The map — the monster's home, and the one place that answers "where am I".
 *
 * Contract: `docs/architecture/08-UX-MONSTER-JOURNEY.md` §7 step 5 and §10.1.
 *
 * It reveals the CURRENT cluster only, plus a compressed trail of what is behind. Fifteen
 * dots at once is the size-of-the-mountain problem: a child needs proof of what they have
 * done and one clear next step, not a wall of locks. Locked weeks are not drawn at all.
 *
 * Everything here is derived from the same `course-map` functions the resume door uses, so
 * the map and `/continue` can never disagree about where the child is. The monster's parts
 * come from completed weeks, so the art cannot drift from the progress either.
 *
 * The map is also the judgment-free exit (§10.3): leaving costs nothing, so nothing on
 * this page uses loss language.
 *
 * Rewritten 2026-08-11. The first version drew the model correctly and communicated none
 * of it: three unlabelled circles, no way to act, and a row of fading dots that read as a
 * broken carousel. Four rules came out of that:
 *
 *  - **The page has one job: continue.** The primary action is a real button that names
 *    where it goes, not a coloured dot a child is expected to guess is tappable.
 *  - **A stop says what it is.** Numbers and words, not `·` and `●`. State is carried by
 *    shape, icon and label together — never by colour alone.
 *  - **Nothing decorative pretends to be information.** The fading dots are gone; how much
 *    is ahead is now a sentence, which is both smaller and honest.
 *  - **The monster is the hero of its own map.** It is named, it is large, and the line
 *    under it says what it grew and what it grows next.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Check } from "lucide-react";
import { getViewerAccess } from "@/lib/access";
import { hasValidConsent } from "@/lib/consent";
import { prisma } from "@/lib/prisma";
import { isCurriculumSessionComplete } from "@/lib/tasks/crystals";
import {
  SESSION_ORDER,
  COURSE_WEEKS,
  courseStops,
  earnedMonsterParts,
  firstIncompleteSession,
  sessionNumberOf,
  weekOfSession,
  weekMeta,
  type CourseSessionId,
} from "@/lib/tasks/course-map";
import { MonsterSVG, speciesFromColor } from "@/components/companion/MonsterSVG";
import { Header } from "@/components/layout/Header";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const { user, allowed } = await getViewerAccess();
  if (!user) redirect("/sign-in");
  if (!allowed) redirect("/no-access");
  if (!(await hasValidConsent(user.id))) redirect("/consent");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: user.id },
    include: { monster: true },
  });
  if (!dbUser?.monster) redirect("/onboarding");

  const completed: CourseSessionId[] = [];
  for (const id of SESSION_ORDER) {
    if (await isCurriculumSessionComplete(dbUser.id, id)) completed.push(id);
  }

  const stops = courseStops(completed);
  const parts = earnedMonsterParts(completed);
  const current = firstIncompleteSession(completed);
  const currentWeek = current ? weekOfSession(current) : null;
  const finished = current === null;

  const doneWeeks = COURSE_WEEKS.filter((w) => currentWeek === null || w.week < currentWeek);
  const lastGrown = doneWeeks.at(-1) ?? null;
  const clusterStops = currentWeek ? stops.filter((s) => s.week === currentWeek) : [];
  const meta = currentWeek ? weekMeta(currentWeek) : null;
  const weeksAhead = currentWeek ? 5 - currentWeek : 0;
  const monsterName = dbUser.monster.name?.trim() || "Твой монстр";

  return (
    <>
      {/* Every other child screen carries the app's chrome. Without it the map read as a
          different product, and it was also the only child screen with no way out. */}
      <Header />
      {/* pb-24: the floating «Сообщить о проблеме» button is fixed to the bottom-left and
          at 320px it sat on top of the week card's last line. */}
      <main className="mx-auto flex w-full max-w-md flex-col justify-center gap-7 px-5 pt-9 pb-24 sm:min-h-[calc(100vh-8rem)]">
      {/* The monster is the reason this page exists, so it gets the size and the name.
          The line under it is the whole progress story in one sentence: what it grew last,
          what it grows next. */}
      <header className="flex flex-col items-center gap-3 text-center">
        {/* Smaller on a 320px phone: at 168px the column ran long enough that the fixed
            «Сообщить о проблеме» button sat on top of the week card's last line. */}
        <MonsterSVG
          size={168}
          className="h-[124px] w-[124px] sm:h-[168px] sm:w-[168px]"
          species={speciesFromColor(dbUser.monster.color)}
          color={dbUser.monster.color}
          unlocked={parts}
        />
        <h1 className="font-display m-0 text-2xl text-[var(--ink)]">{monsterName}</h1>
        <p className="m-0 max-w-[19rem] text-balance text-sm font-semibold text-[var(--text-secondary)]">
          {finished
            ? "вырос полностью — все пять недель позади"
            : lastGrown
              ? `${lastGrown.partGrownRu} за ${lastGrown.ideaRu.toLowerCase()} · дальше ${meta?.partRu}`
              : "он ещё маленький — первая неделя всё изменит"}
        </p>
      </header>

      {/* The one job of this page. A child should never have to discover that a coloured
          circle is a button, so the button is a button and it says where it goes. */}
      {current && meta && currentWeek ? (
        <Link
          href={`/session/${current}`}
          data-testid="map-continue"
          className="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-full bg-[var(--color-primary)] px-6 py-3 text-white shadow-[var(--shadow-card)] transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97]"
        >
          <span className="font-display text-lg leading-none">Продолжить</span>
          <span className="text-xs font-bold opacity-90">
            неделя {currentWeek} · сессия {sessionNumberOf(current)} — {meta.ideaRu.toLowerCase()}
          </span>
        </Link>
      ) : null}

      {meta && currentWeek ? (
        <section className="flex flex-col gap-4 rounded-3xl border border-[var(--color-primary-soft)] bg-[var(--surface)] p-5">
          <h2 className="font-display m-0 text-lg text-[var(--ink)]">
            неделя {currentWeek} · {meta.ideaRu}
          </h2>

          {/* Three stops, each saying what it is. A locked stop is quiet, never dashed:
              dashes read as broken, and this week is not broken — it is simply ahead. */}
          <ol className="m-0 flex list-none gap-3 p-0">
            {clusterStops.map((stop) => {
              const label = `сессия ${stop.session}`;
              if (stop.state === "locked") {
                return (
                  <li key={stop.sessionId} className="flex flex-1 flex-col items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className="grid h-11 w-11 place-items-center rounded-full border-2 border-[var(--border-color)] bg-[var(--surface-strong)] font-display text-base text-[var(--text-muted)]"
                    >
                      {stop.session}
                    </span>
                    <span className="text-[11px] font-bold text-[var(--text-muted)]">
                      {label} — потом
                    </span>
                  </li>
                );
              }
              const done = stop.state === "done";
              return (
                <li key={stop.sessionId} className="flex flex-1 flex-col items-center gap-1.5">
                  <Link
                    href={`/session/${stop.sessionId}`}
                    aria-label={done ? `${label} — пройдена` : `${label} — продолжить`}
                    aria-current={done ? undefined : "step"}
                    className={`grid h-11 w-11 place-items-center rounded-full font-display text-base text-white transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.94] ${
                      done
                        ? "bg-[var(--color-success)]"
                        : "bg-[var(--color-primary)] ring-4 ring-[var(--color-primary-soft)]"
                    }`}
                  >
                    {done ? <Check aria-hidden="true" size={20} strokeWidth={3} /> : stop.session}
                  </Link>
                  <span
                    className={`text-[11px] font-bold ${
                      done ? "text-[var(--text-muted)]" : "text-[var(--color-primary-dark)]"
                    }`}
                  >
                    {label} — {done ? "пройдена" : "сейчас"}
                  </span>
                </li>
              );
            })}
          </ol>

          <p className="m-0 text-sm font-semibold text-[var(--text-muted)]">
            в конце недели монстр отрастит: {meta.partRu}
          </p>
        </section>
      ) : null}

      {/* The road behind. Plain rows, not cards: this is proof, and proof should be quiet
          next to the thing the child is about to do. */}
      {doneWeeks.length ? (
        <section className="flex flex-col gap-2" aria-label="Пройденные недели">
          {doneWeeks.map((w) => (
            <p
              key={w.week}
              className="m-0 flex items-center gap-2.5 text-sm font-bold text-[var(--text-secondary)]"
            >
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-success)] text-white">
                <Check aria-hidden="true" size={14} strokeWidth={3} />
              </span>
              неделя {w.week} · {w.ideaRu} — {w.partGrownRu}
            </p>
          ))}
        </section>
      ) : null}

      {finished ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-[var(--color-success)] bg-[var(--surface)] p-6 text-center">
          <h2 className="font-display m-0 text-xl text-[var(--ink)]">Все пять недель пройдены</h2>
          <p className="m-0 text-sm font-semibold text-[var(--text-muted)]">
            Твой монстр вырос полностью — и это не конец, а начало.
          </p>
        </section>
      ) : null}

      {/* What is ahead is a sentence, not three fading dots. The dots looked like a broken
          carousel and told a child nothing; §10.1 still forbids drawing the locked weeks. */}
      {weeksAhead > 0 ? (
        <p className="m-0 text-center text-xs font-bold text-[var(--text-muted)]">
          дальше ещё {weeksAhead} {weeksAhead === 1 ? "неделя" : weeksAhead < 5 ? "недели" : "недель"} — по одной за раз
        </p>
      ) : null}

        {/* §10.3: leaving costs nothing, so the way out is plainly on the page and worded
            without a single gram of loss. */}
        <Link
          href="/dashboard"
          data-testid="map-exit"
          className="mx-auto inline-flex min-h-11 items-center rounded-full px-5 text-sm font-bold text-[var(--text-muted)] transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97]"
        >
          в кабинет
        </Link>
      </main>
    </>
  );
}
