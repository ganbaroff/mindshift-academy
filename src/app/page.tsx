"use client";

import Link from "next/link";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Heart,
  KeyRound,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import { InteractiveShowcase } from "@/components/showcase/InteractiveShowcase";
import { SignedInContinue } from "@/components/access/SignedInContinue";

const benefitsRu = [
  {
    title: "Безопасная среда",
    copy: "Сначала согласие родителя, затем обучение и проверка безопасности каждого сообщения.",
    icon: ShieldCheck,
  },
  {
    title: "Неделя 1: мышление",
    copy: "Короткие сессии: ребёнок учит монстра точным командам — ИИ делает ровно то, что сказано.",
    icon: Heart,
  },
  {
    title: "Прогресс для родителя",
    copy: "В кабинете видно, что ребёнок освоил, а данные Academy можно удалить в любой момент.",
    icon: Award,
  },
] as const;

const journey = [
  {
    title: "Взрослый открывает доступ",
    copy: "Войдите или зарегистрируйтесь — это шаг для родителя.",
    icon: UserRound,
  },
  {
    title: "Подтвердите email взрослого",
    copy: "6-значный код взрослого приходит на email. Это не код ребёнка.",
    icon: ShieldCheck,
  },
  {
    title: "Ребёнок вводит код приглашения",
    copy: "Взрослый получает 8-символьный код ребёнка по приглашению и передаёт его ему.",
    icon: KeyRound,
  },
] as const;

const COPY = {
  parentCta: "Я взрослый — начать",
  parentCtaHint: "Создать доступ для семьи",
  signIn: "Войти",
  childCta: "У ребёнка уже есть код",
  childCtaHint: "8-символьный код ребёнка",
  requestPrefix: "Ещё нет доступа?",
  requestCta: "Оставить заявку",
  badge: "Закрытый тест · мышление с ИИ",
  h1: "Неделя 1 мышления — точные команды для ИИ, старт для родителя",
  subtitle:
    "Вы открываете доступ и подтверждаете согласие. Ребёнок учит монстра: ИИ — инструмент, он делает только то, что сказано клетка за клеткой.",
  benefits: benefitsRu,
  journeyTitle: "Как семья начнёт",
  journey,
  tryTitle: "Сначала посмотрите, как это ощущается",
  tryCopy:
    "Это ознакомительная проба: она не создаёт аккаунт и не отправляет слова ребёнка во внешний ИИ. Для курса нужен родительский доступ или код.",
  howTitle: "Что будет дальше",
  steps: [
    {
      tag: "01. Родитель",
      title: "Открывает безопасный старт",
      copy: "Аккаунт и согласие подтверждают, что ребёнок может начать обучение.",
    },
    {
      tag: "02. Ребёнок",
      title: "Вводит свой код",
      copy: "Питомец появляется в игре, сессии недели 1 открываются по порядку.",
    },
    {
      tag: "03. Семья",
      title: "Видит настоящий прогресс",
      copy: "Родительский кабинет показывает освоенные навыки без оценок и давления.",
    },
  ],
} as const;

export default function HomePage() {
  const t = COPY;

  return (
    <main className="relative isolate min-h-screen bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.18),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_50%_110%,rgba(233,196,0,0.1),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:gap-4 sm:px-6 sm:py-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          <span className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/5 text-base text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            M
          </span>
          MindShift
        </Link>

        <Link
          href="/sign-in"
          className="inline-flex min-h-11 items-center rounded-full border border-white/12 bg-white/[0.04] px-4 py-2 text-sm font-medium text-white/78 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          {t.signIn}
        </Link>
      </header>

      <SignedInContinue />

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-4 pb-12 pt-4 sm:px-6 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12 lg:px-8 lg:pb-16 lg:pt-10">
        <div className="flex min-w-0 flex-col justify-center space-y-7">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-warning">
            <Star className="h-4 w-4 fill-warning/20 text-warning" aria-hidden="true" />
            {t.badge}
          </div>

          <div className="min-w-0 space-y-5">
            <h1 className="max-w-3xl text-balance break-words text-3xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              {t.h1}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/72 sm:text-lg">{t.subtitle}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <div className="flex flex-col gap-1.5">
              <Link
                href="/sign-up"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-base font-semibold text-white shadow-[0_0_40px_rgba(139,92,246,0.35)] transition-transform [@media(hover:hover)]:hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {t.parentCta}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
              <span className="text-center text-xs text-white/52">{t.parentCtaHint}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <Link
                href="/enter-code"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/16 bg-white/[0.04] px-6 text-base font-semibold text-white/88 transition-colors hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <KeyRound className="h-5 w-5 text-warning" aria-hidden="true" />
                {t.childCta}
              </Link>
              <span className="text-center text-xs text-white/52">{t.childCtaHint}</span>
            </div>
          </div>

          {/* Third door: no invite yet — ask for one instead of hitting a closed wall. */}
          <p className="text-sm text-white/60">
            {t.requestPrefix}{" "}
            <Link
              href="/request-access"
              className="font-medium text-primary-soft underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              {t.requestCta}
            </Link>
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            {t.benefits.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <article
                  key={pillar.title}
                  className="rounded-[18px] border border-white/10 bg-surface/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.16)]"
                >
                  <span className="mb-3 grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                    <Icon className="h-5 w-5 text-violet-400" aria-hidden="true" />
                  </span>
                  <h2 className="text-sm font-semibold text-white">{pillar.title}</h2>
                  <p className="mt-1.5 text-xs leading-5 text-white/62">{pillar.copy}</p>
                </article>
              );
            })}
          </div>
        </div>

        <aside
          aria-labelledby="family-start-title"
          className="self-center rounded-[32px] border border-white/10 bg-surface/90 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.28)] sm:p-7"
        >
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-warning">Старт без путаницы</p>
          <h2 id="family-start-title" className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {t.journeyTitle}
          </h2>
          <ol className="mt-6 space-y-4">
            {t.journey.map((step, index) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="flex gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-sm font-semibold text-primary-soft">
                    {index + 1}
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-warning" aria-hidden="true" />
                      <h3 className="text-sm font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="mt-1.5 text-sm leading-6 text-white/62">{step.copy}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.08] p-4 text-sm leading-6 text-white/76">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary-soft" aria-hidden="true" />
            <p>Выберите путь своей семьи: взрослый начинает доступ или ребёнок вводит уже полученный код приглашения.</p>
          </div>
        </aside>
      </section>

      <section aria-labelledby="try-title" className="relative z-10 mx-auto w-full max-w-5xl px-6 py-12 lg:px-8 lg:py-16">
        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-warning">Ознакомительная проба</p>
          <h2 id="try-title" className="mt-3 text-balance text-3xl font-semibold text-white sm:text-4xl">
            {t.tryTitle}
          </h2>
          <p className="mt-3 text-sm leading-6 text-white/64 sm:text-base">{t.tryCopy}</p>
        </div>
        <InteractiveShowcase />
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 lg:px-8 lg:pb-24">
        <h2 className="mb-8 text-center text-2xl font-semibold text-white">{t.howTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {t.steps.map((step) => (
            <article key={step.tag} className="rounded-[20px] border border-white/10 bg-surface/70 p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">{step.tag}</p>
              <h3 className="mt-3 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/62">{step.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
