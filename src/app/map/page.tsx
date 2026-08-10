/**
 * The map — stops on the monster's route.
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
 */

import Link from "next/link";
import { redirect } from "next/navigation";
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
  weekOfSession,
  weekMeta,
  type CourseSessionId,
} from "@/lib/tasks/course-map";
import { MonsterSVG, speciesFromColor } from "@/components/companion/MonsterSVG";

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

  const doneWeeks = COURSE_WEEKS.filter(
    (w) => currentWeek === null || w.week < currentWeek
  );
  const clusterStops = currentWeek ? stops.filter((s) => s.week === currentWeek) : [];
  const meta = currentWeek ? weekMeta(currentWeek) : null;

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-5 px-4 py-7">
      <div className="flex flex-col items-center gap-2">
        <MonsterSVG
          size={112}
          species={speciesFromColor(dbUser.monster.color)}
          color={dbUser.monster.color}
          unlocked={parts}
        />
        <p className="text-sm font-bold text-[var(--text-muted)]">
          {parts.length === 0
            ? "твой монстр ждёт первой недели"
            : "твой монстр растёт с каждой неделей"}
        </p>
      </div>

      {/* The trail: proof of what is behind, one line per finished week. */}
      {doneWeeks.map((w) => (
        <div
          key={w.week}
          className="flex items-center gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm font-bold text-[var(--text-secondary)]"
        >
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-success)] text-xs font-extrabold text-white">
            ✓
          </span>
          неделя {w.week} · {w.ideaRu} — выросли {w.partRu}
        </div>
      ))}

      {meta && currentWeek ? (
        <section className="flex flex-col gap-4 rounded-3xl border border-[var(--color-primary-soft)] bg-[var(--surface)] p-5">
          <h1 className="font-display m-0 text-lg text-[var(--ink)]">
            неделя {currentWeek} · {meta.ideaRu}
          </h1>

          <div className="flex gap-3">
            {clusterStops.map((stop) => {
              const label = `Сессия ${stop.session}`;
              if (stop.state === "locked") {
                return (
                  <span
                    key={stop.sessionId}
                    aria-label={`${label} — откроется позже`}
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-dashed border-[var(--border-color)] bg-[var(--surface-strong)] text-[var(--text-muted)]"
                  >
                    ·
                  </span>
                );
              }
              const done = stop.state === "done";
              return (
                <Link
                  key={stop.sessionId}
                  href={`/session/${stop.sessionId}`}
                  aria-label={done ? `${label} — пройдена` : `${label} — продолжить`}
                  aria-current={done ? undefined : "step"}
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-lg font-extrabold text-white transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.94] ${
                    done ? "bg-[var(--color-success)]" : "bg-[var(--color-primary)]"
                  }`}
                >
                  {done ? "✓" : "●"}
                </Link>
              );
            })}
          </div>

          <p className="m-0 text-sm font-semibold text-[var(--text-muted)]">
            в конце недели монстр отрастит: {meta.partRu}
          </p>
        </section>
      ) : null}

      {finished ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-[var(--color-success)] bg-[var(--surface)] p-6 text-center">
          <h1 className="font-display m-0 text-xl text-[var(--ink)]">Все пять недель пройдены</h1>
          <p className="m-0 text-sm font-semibold text-[var(--text-muted)]">
            Твой монстр вырос полностью — и это не конец, а начало.
          </p>
        </section>
      ) : null}

      {/* Weeks still ahead are not drawn as locks — a child sees the road behind and the
          one step in front, never the size of the mountain. */}
      {currentWeek && currentWeek < 5 ? (
        <div className="flex justify-center gap-2 pt-1" aria-hidden="true">
          <span className="h-2 w-2 rounded-full bg-[var(--text-muted)] opacity-55" />
          <span className="h-2 w-2 rounded-full bg-[var(--text-muted)] opacity-30" />
          <span className="h-2 w-2 rounded-full bg-[var(--text-muted)] opacity-15" />
        </div>
      ) : null}
    </main>
  );
}
