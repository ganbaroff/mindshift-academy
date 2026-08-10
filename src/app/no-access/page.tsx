import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function NoAccessPage() {
  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.18),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.14),transparent_30%)]" />

      <section className="relative z-10 w-full max-w-md rounded-[28px] border border-[var(--border-color)] bg-surface/90 p-8 text-center shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)]">
          <ShieldCheck className="h-6 w-6 text-warning" />
        </span>

        <h1 className="text-2xl font-semibold text-[var(--ink)]">Доступ по приглашению</h1>

        <p className="mt-3 text-sm leading-6 text-[var(--ink)]/64">
          MindShift Academy сейчас открыта только для приглашённых аккаунтов и бесплатна.
          Оставьте заявку — мы открываем доступ вручную, небольшими группами, и пришлём код
          для ребёнка на вашу почту.
        </p>

        <Link
          href="/request-access"
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          Оставить заявку
        </Link>

        <Link
          href="/"
          className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[var(--border-color)] px-6 text-sm font-medium text-[var(--ink)]/78 transition-colors hover:bg-[var(--surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          На главную
        </Link>
      </section>
    </main>
  );
}
