"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Star, Heart, Award } from "lucide-react";
import { InteractiveShowcase } from "@/components/showcase/InteractiveShowcase";

const benefitsRu = [
  {
    title: "Безопасная среда",
    copy: "Интеллектуальный фильтр автоматически очищает любые некорректные запросы.",
    icon: ShieldCheck,
  },
  {
    title: "Забота и тепло",
    copy: "Питомец искренне скучает по урокам, вдохновляя продолжать без чувства вины.",
    icon: Heart,
  },
  {
    title: "Конфиденциальность",
    copy: "Мы не записываем голос ребёнка.",
    icon: Award,
  },
] as const;

const benefitsAz = [
  {
    title: "Təhlükəsiz mühit",
    copy: "Ağıllı filtr uşağın daxil etdiyi qeyri-etik və ya uyğunsuz sorğuları avtomatik təmizləyir.",
    icon: ShieldCheck,
  },
  {
    title: "Şəfqətli yanaşma",
    copy: "Virtual köməkçi dərslər üçün darıxır və övladınızı heç bir təzyiq olmadan öyrənməyə həvəsləndirir.",
    icon: Heart,
  },
  {
    title: "Məxfilik qorunması",
    copy: "Uşağın səsini qeydə almırıq.",
    icon: Award,
  },
] as const;

type Lang = "ru" | "az";

const COPY = {
  ru: {
    parentDashboard: "Личный кабинет родителя",
    signIn: "Войти",
    badge: "Интерактивный курс",
    h1: "Ваш ребёнок научится управлять ИИ за 5 игровых уроков",
    subtitle:
      "Мы превратили программирование искусственного интеллекта в увлекательную сказку. Ребёнок создаёт цифрового питомца, обучает его командам и защищает от вирусов, осваивая базовые принципы инженерии запросов без скучных лекций.",
    benefits: benefitsRu,
    howTitle: "Как это работает?",
    steps: [
      {
        tag: "01. Запуск волшебства",
        title: "Ребёнок создаёт питомца",
        copy: "Вводя 3 стартовых слова, ребёнок задаёт характер своего напарника и видит его рождение на экране.",
      },
      {
        tag: "02. Доступ по приглашению",
        title: "Бесплатно по реферальной ссылке",
        copy: "Все 5 уроков открыты без оплаты. Доступ выдаётся по приглашению — только для аккаунта, который вы укажете.",
      },
      {
        tag: "03. Отчёт родителям",
        title: "Доказательство прогресса",
        copy: "Вы получаете еженедельные отчёты с настоящими командами, которые ребёнок сам научился писать на уроках.",
      },
    ],
  },
  az: {
    parentDashboard: "Valideyn kabineti",
    signIn: "Daxil ol",
    badge: "İnteraktiv kurs",
    h1: "Övladınız 5 oyun dərsi ilə Süni İntellekti idarə etməyi öyrənəcək",
    subtitle:
      "Biz süni intellekt proqramlaşdırmasını maraqlı nağıla çevirdik. Övladınız rəqəmsal köməkçi yaradacaq, ona əmrlər öyrədəcək və sistemləri qoruyacaq. Bu prosesdə heç bir sıxıcı mühazirə olmadan mühüm rəqəmsal bacarıqlara yiyələnəcək.",
    benefits: benefitsAz,
    howTitle: "Bu necə işləyir?",
    steps: [
      {
        tag: "01. Sehrin başlanğıcı",
        title: "Uşaq köməkçisini yaradır",
        copy: "3 söz daxil edərək uşaq köməkçisinin xarakterini təyin edir və onun ekranda doğulduğunu görür.",
      },
      {
        tag: "02. Dəvətlə giriş",
        title: "Dəvət linki ilə pulsuz",
        copy: "Bütün 5 dərs ödənişsizdir. Giriş yalnız sizin göstərdiyiniz hesab üçün dəvət linki ilə verilir.",
      },
      {
        tag: "03. Valideynə hesabat",
        title: "İrəliləyişin sübutu",
        copy: "Hər həftə övladınızın dərslərdə özünün yazmağı öyrəndiyi əsl əmrlərlə hesabat alırsınız.",
      },
    ],
  },
} as const satisfies Record<Lang, unknown>;

export default function HomePage() {
  const [lang, setLang] = useState<Lang>("ru");
  const t = COPY[lang];

  return (
    <main className="relative isolate overflow-hidden bg-background text-foreground min-h-screen">
      {/* Premium background radial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.18),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_50%_110%,rgba(233,196,0,0.1),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      {/* Header */}
      <header className="relative z-10 mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.24em] text-white/80 uppercase">
          <span className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/5 text-base text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            M
          </span>
          MindShift
        </Link>

        <div className="flex items-center gap-2 text-sm text-white/70">
          {/* RU / AZ language toggle */}
          <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] p-1" role="group" aria-label="Язык / Dil">
            {(["ru", "az"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                aria-pressed={lang === l}
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                  lang === l ? "bg-primary text-white" : "text-white/55 hover:text-white/85"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          <Link
            href="/dashboard?demo=1"
            className="hidden rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition-colors hover:bg-white/[0.08] sm:inline-flex"
          >
            {t.parentDashboard}
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-4 py-2 transition-colors hover:bg-white/[0.06]"
          >
            {t.signIn}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-6 pb-14 pt-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:px-8 lg:pb-20 lg:pt-10">
        <div className="space-y-8 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-warning">
            <Star className="h-4 w-4 fill-warning/20 text-warning" />
            {t.badge}
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] text-white sm:text-5xl lg:text-6xl">
              {t.h1}
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/70 sm:text-lg">{t.subtitle}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {t.benefits.map((pillar) => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.title}
                  className="rounded-[18px] border border-white/10 bg-surface/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.16)] flex flex-col justify-between"
                >
                  <div>
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] mb-3">
                      <Icon className="h-5 w-5 text-violet-400" />
                    </span>
                    <p className="text-sm font-semibold text-white">{pillar.title}</p>
                    <p className="mt-1.5 text-xs leading-5 text-white/60">{pillar.copy}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Interactive App Showcase */}
        <InteractiveShowcase />
      </section>

      {/* Course workflow section */}
      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 lg:px-8 lg:pb-24">
        <h2 className="text-2xl font-semibold text-white text-center mb-8">{t.howTitle}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {t.steps.map((step) => (
            <div key={step.tag} className="rounded-[20px] border border-white/10 bg-surface/70 p-6">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">{step.tag}</p>
              <p className="mt-3 text-lg font-semibold text-white">{step.title}</p>
              <p className="mt-2 text-sm leading-6 text-white/60">{step.copy}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
