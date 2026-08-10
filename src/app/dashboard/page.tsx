import { auth, currentUser } from "@clerk/nextjs/server";
import { Link as LinkIcon, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CopyReportButton } from "@/components/dashboard/CopyReportButton";
import { InventoryGrid } from "@/components/dashboard/InventoryGrid";
import { prisma } from "@/lib/prisma";
import { getViewerAccess } from "@/lib/access";
import { DashboardMonster } from "@/components/dashboard/DashboardMonster";
import { ManageConsent } from "@/components/dashboard/ManageConsent";
import { OperatorContactLine } from "@/components/support/OperatorContactLine";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type DashboardLesson = {
  title: string;
  outcome: string;
  prompt: string;
};

const demoInventory = [
  { id: "1", itemType: "skin", itemId: "cyber_visor", acquiredAt: new Date() },
  { id: "2", itemType: "skin", itemId: "neon_wings", acquiredAt: new Date() },
  { id: "3", itemType: "skin_shard", itemId: "golden_crown", acquiredAt: new Date() },
  { id: "4", itemType: "skin", itemId: "flame_aura", acquiredAt: new Date() },
];

const demoLessons: DashboardLesson[] = [
  {
    title: "IF / ELSE",
    outcome: "Ребёнок научился задавать правило и проверять реакцию монстра.",
    prompt: "Если я говорю FIRE, отвечай WATER.",
  },
  {
    title: "Persona",
    outcome: "Монстр стал говорить в нужном тоне без потери доброжелательности.",
    prompt: "Говори как добрый, но уверенный наставник.",
  },
  {
    title: "Encryption",
    outcome: "Текст теперь можно перевести в секретный формат и вернуть обратно.",
    prompt: "Замени гласные на * и сохрани смысл.",
  },
];

export default async function DashboardPage({ searchParams }: { searchParams?: SearchParams }) {
  const params = (await searchParams) ?? {};
  const isDemo = params.demo === "1";
  const demoMonsterSeed = typeof params.monster === "string" ? params.monster.replace(/-/g, " ") : null;
  const { userId } = await auth();

  if (!userId && !isDemo) {
    redirect("/sign-in");
  }

  // Invite-only access: approved accounts only (no payment). Demo preview stays open.
  if (userId && !isDemo) {
    const { allowed } = await getViewerAccess();
    if (!allowed) {
      redirect("/no-access");
    }
  }

  const clerkUser = userId ? await currentUser() : null;
  const dbUser = userId
    ? await prisma.user.findUnique({
        where: { clerkId: userId },
        include: {
          monster: true,
          inventory: true,
          progress: {
            include: {
              lesson: true,
            },
          },
        },
      })
    : null;

  const lessonRows =
    dbUser?.progress.length
      ? dbUser.progress
          .map((item) => ({
            title: item.lesson.title,
            outcome: item.completed
              ? "Урок завершён и сохранён в weekly proof."
              : "Урок открыт и ждёт следующего шага.",
            prompt: item.lesson.description,
          }))
          .slice(0, 3)
      : isDemo
        ? demoLessons
        : [];

  const displayName =
    clerkUser?.firstName ||
    clerkUser?.fullName ||
    dbUser?.username ||
    (isDemo ? "Demo parent" : "Родитель");

  const monsterName = dbUser?.monster?.name ?? demoMonsterSeed ?? "Огненный Дракончик";
  const monsterMood = dbUser?.monster?.mood ?? 78;
  const streak = dbUser?.streak ?? 3;
  const crystals = dbUser?.crystals ?? 120;
  const totalXp = dbUser?.xp ?? 450;
  const inventoryCount = dbUser?.inventory.length ?? (isDemo ? demoInventory.length : 0);

  const reportText = [
    "MindShift weekly proof",
    `Parent: ${displayName}`,
    `Monster: ${monsterName}`,
    `Mood: ${monsterMood}/100`,
    `Streak: ${streak} days`,
    `XP: ${totalXp}`,
    `Crystals: ${crystals}`,
    "",
    ...lessonRows.map((lesson) => `- ${lesson.title}: ${lesson.outcome}`),
  ].join("\n");

  return (
    <main className="relative isolate min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(139,92,246,0.18),transparent_32%),radial-gradient(circle_at_82%_16%,rgba(34,211,238,0.14),transparent_28%),radial-gradient(circle_at_48%_100%,rgba(233,196,0,0.1),transparent_26%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:gap-4 sm:px-6 sm:py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.24em] text-[var(--text-secondary)] uppercase">
          <span className="grid h-9 w-9 place-items-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] text-base text-[var(--ink)]">
            M
          </span>
          MindShift
        </Link>

        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-2">
            {isDemo ? "Демо-режим" : "Панель родителя"}
          </span>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-transparent px-4 py-2 transition-colors hover:bg-[var(--surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            На главную
            <LinkIcon className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-4 pb-16 pt-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8 lg:pb-20 lg:pt-8">
        <div className="min-w-0 space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[var(--text-secondary)]">
            <UserRound className="h-4 w-4 text-[var(--color-secondary-dark)]" />
            Доказательство обучения
          </div>

          <div className="min-w-0 space-y-4">
            <h1 className="max-w-3xl text-balance break-words text-3xl font-semibold leading-[1.05] text-[var(--ink)] sm:text-5xl lg:text-6xl">
              Панель родителей, где видно реальное обучение.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg">
              Вы видите прогресс ребёнка за эту неделю, как менялся монстр
              и как растут его серия дней и кристаллы. Данные Academy можно удалить в настройках согласия.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Настроение", value: `${monsterMood}/100`, hint: "Состояние питомца", isStreak: false },
              { label: "Серия дней", value: `${streak} дн.`, hint: "Мотивация", isStreak: true },
              { label: "Инвентарь", value: `${inventoryCount} шт.`, hint: "Разблокировано", isStreak: false },
            ].map((item) => (
              <div key={item.label} className="rounded-[20px] border border-[var(--border-color)] bg-surface/80 p-5">
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-[var(--ink)]/45">{item.label}</p>
                <p className="mt-3 text-2xl font-semibold text-[var(--ink)] flex items-center gap-2">
                  {item.value}
                  {item.isStreak && (
                    <span
                      aria-hidden="true"
                      className={`inline-flex items-center ${streak > 5 ? "animate-pulse drop-shadow-[0_0_8px_rgba(234,179,8,0.6)] motion-reduce:animate-none" : ""}`}
                    >
                      🔥
                    </span>
                  )}
                </p>
                <p className="mt-2 text-sm text-[var(--ink)]/58">{item.hint}</p>
              </div>
            ))}
          </div>

          <section className="rounded-[28px] border border-[var(--color-primary-soft)] bg-[var(--surface-strong)] p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--text-muted)]">
                  Основной курс · закрытая beta
                </p>
                <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">Неделя 1: точность мышления</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                  Три сессии с исполняемыми заданиями. Ребёнок описывает — монстр рисует буквально.
                  Сессии 2–3 открываются после завершения предыдущей. Старые 5 уроков Module 1 — архив.
                </p>
              </div>
              <Link
                href="/continue"
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary)]"
              >
                <Sparkles className="h-4 w-4" />
                Продолжить с того места
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-muted)]">
              <Link href="/session/w1-s1" className="rounded-full border border-[var(--border-color)] px-3 py-1.5 hover:bg-[var(--surface-strong)]">
                Сессия 1 · Точность
              </Link>
              <Link href="/session/w1-s2" className="rounded-full border border-[var(--border-color)] px-3 py-1.5 hover:bg-[var(--surface-strong)]">
                Сессия 2 · Фигура
              </Link>
              <Link href="/session/w1-s3" className="rounded-full border border-[var(--border-color)] px-3 py-1.5 hover:bg-[var(--surface-strong)]">
                Сессия 3 · Клетка в клетку
              </Link>
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border-color)] bg-surface/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--ink)]/45">
                  Недельный отчёт
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Что ребёнок сделал на этой неделе</h2>
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  Основной прогресс — в сессиях недели 1 выше. Ниже Module 1 только если ребёнок
                  успел пройти старые уроки (архив).
                </p>
              </div>

              <CopyReportButton text={reportText} />
            </div>

            <div className="mt-6 space-y-4">
              {!dbUser?.progress.length && !isDemo ? (
                <p className="rounded-[20px] border border-dashed border-[var(--border-color)] bg-[var(--surface-strong)] p-4 text-sm text-[var(--text-muted)]">
                  Пока нет архивных уроков Module 1 — это нормально. Смотри блок «Неделя 1: точность
                  мышления».
                </p>
              ) : null}
              {lessonRows.map((lesson) => (
                <div
                  key={lesson.title}
                  className="rounded-[20px] border border-[var(--border-color)] bg-surface-strong/80 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{lesson.title}</p>
                      <p className="mt-1 text-sm leading-6 text-[var(--ink)]/62">{lesson.outcome}</p>
                    </div>
                    <span className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-1.5 text-xs text-[var(--ink)]/62">
                      Прогресс урока
                    </span>
                  </div>
                  <p className="mt-4 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm leading-6 text-[var(--ink)]/76">
                    {lesson.prompt}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-[28px] border border-[var(--border-color)] bg-surface/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--ink)]/45">
              Поддержка пилота
            </p>
            <h2 className="mt-2 text-xl font-semibold text-[var(--ink)]">Связь с оператором</h2>
            <div className="mt-4">
              <OperatorContactLine />
            </div>
          </section>

          {/* COPPA (§7): real (non-demo) parents can view + revoke consent here. */}
          {!isDemo && userId && <ManageConsent />}

          <section className="rounded-[28px] border border-[var(--border-color)] bg-surface/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--ink)]/45">
                  Профиль питомца
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">{monsterName}</h2>
              </div>

              <div className="rounded-full border border-[var(--border-color)] bg-[var(--surface-strong)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                {isDemo ? "Предпросмотр" : "Подключено"}
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-[var(--border-color)] bg-surface-strong/90 p-5">
              <div className="flex items-center gap-3">
                <DashboardMonster color={dbUser?.monster?.color ?? "#8b5cf6"} moodValue={monsterMood} />
                <div>
                  <p className="text-sm text-[var(--ink)]/58">Активный питомец</p>
                  <p className="text-lg font-semibold text-[var(--ink)]">{monsterName}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink)]/45">Настроение</p>
                  <p className="text-sm font-semibold text-[var(--ink)]">{monsterMood}/100</p>
                </div>
                <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-[var(--surface-strong)]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-[width] duration-500 motion-reduce:transition-none"
                    style={{ width: `${monsterMood}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink)]/45">XP</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--ink)] tabular-nums">{totalXp}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--ink)]/45">Кристаллы</p>
                  <p className="mt-2 text-xl font-semibold text-[var(--ink)] tabular-nums">{crystals}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-warning" />
                  <p className="text-sm font-semibold text-[var(--ink)]">Культурное доверие</p>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--ink)]/62">
                  Родители получают отчёт без давления и без стыда. Прогресс монстра,
                  вежливый тон.
                </p>
              </div>

              {inventoryCount > 0 && (
                <div className="mt-6 border-t border-[var(--border-color)] pt-5">
                  <InventoryGrid items={dbUser?.inventory ?? (isDemo ? demoInventory : [])} />
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-[var(--border-color)] bg-surface/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--ink)]/45">
                  Для родителей
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Недельный отчёт под рукой</h2>
              </div>

              <Sparkles className="h-5 w-5 text-[var(--color-secondary-dark)]" />
            </div>

            <p className="mt-4 text-sm leading-6 text-[var(--ink)]/64">
              Каждую неделю можно скопировать короткий отчёт о том, чему научился
              ребёнок, и сохранить его себе или отправить близким — спокойно, без
              оценок и давления.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-strong)]"
              >
                На главную
                <LinkIcon className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
