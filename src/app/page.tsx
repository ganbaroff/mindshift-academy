import Link from "next/link";
import { ArrowRight, Mail, ShieldCheck, Sparkles, Star } from "lucide-react";
import { FunnelExperience } from "@/components/funnel/FunnelExperience";

const pillars = [
  {
    title: "Never Red",
    copy: "Ошибки и подсказки живут в фиолетовой и янтарной зоне, без красного триггера.",
    icon: ShieldCheck,
  },
  {
    title: "Shame-Free",
    copy: "Питомец скучает по урокам, а не стыдит за пропуск.",
    icon: Sparkles,
  },
  {
    title: "48h Voice Purge",
    copy: "Голосовые следы не задерживаются дольше 48 часов.",
    icon: Mail,
  },
] as const;

export default function HomePage() {
  return (
    <main className="relative isolate overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.2),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.16),transparent_30%),radial-gradient(circle_at_50%_110%,rgba(233,196,0,0.12),transparent_28%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/10" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 text-sm font-semibold tracking-[0.24em] text-white/80 uppercase">
          <span className="grid h-9 w-9 place-items-center rounded-2xl border border-white/10 bg-white/5 text-base text-white shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
            M
          </span>
          MindShift
        </Link>

        <div className="flex items-center gap-2 text-sm text-white/70">
          <Link
            href="/dashboard?demo=1"
            className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 transition-colors hover:bg-white/[0.08]"
          >
            Preview parent view
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-4 py-2 transition-colors hover:bg-white/[0.06]"
          >
            Sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto grid w-full max-w-7xl gap-8 px-6 pb-14 pt-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-10 lg:px-8 lg:pb-20 lg:pt-10">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/70">
            <Star className="h-4 w-4 text-[color:var(--color-warning)]" />
            Phase 1 funnel
          </div>

          <div className="space-y-5">
            <h1 className="max-w-3xl text-4xl font-semibold leading-[0.95] text-white sm:text-5xl lg:text-6xl">
              Три слова будят монстра.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-white/72 sm:text-lg">
              Ребёнок вводит 3 слова, видит силуэт, а paywall открывается только после
              того, как случится настоящий aha-момент. Родитель получает оплату и
              доказательство обучения, а не пустую анимацию.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {pillars.map((pillar) => {
              const Icon = pillar.icon;

              return (
                <div
                  key={pillar.title}
                  className="rounded-[18px] border border-white/10 bg-surface/90 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.16)]"
                >
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
                      <Icon className="h-5 w-5 text-primary-soft" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white">{pillar.title}</p>
                      <p className="mt-1 text-sm leading-6 text-white/60">{pillar.copy}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <FunnelExperience />
      </section>

      <section className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 lg:px-8 lg:pb-20">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[20px] border border-white/10 bg-surface/70 p-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">01 Hook</p>
            <p className="mt-3 text-lg font-semibold text-white">Вау до email</p>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Сначала ребёнок чувствует магию. Потом приходит родительский gate.
            </p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-surface/70 p-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">02 Paywall</p>
            <p className="mt-3 text-lg font-semibold text-white">29 AZN / month</p>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Lemon Squeezy checkout открывается только после силуэта и слов.
            </p>
          </div>
          <div className="rounded-[20px] border border-white/10 bg-surface/70 p-5">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/45">03 Proof</p>
            <p className="mt-3 text-lg font-semibold text-white">Parent dashboard</p>
            <p className="mt-2 text-sm leading-6 text-white/62">
              Еженедельный отчёт показывает, чему ребёнок реально научился.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
