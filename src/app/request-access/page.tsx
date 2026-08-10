"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { OperatorContactLine } from "@/components/support/OperatorContactLine";
import { ACCESS_REQUEST_LIMITS } from "@/lib/access-requests";

// Public parent-facing request form. Adults only: we ask for the parent's own contact and
// nothing about the child. Submitting grants no access — an operator approves by hand and
// sends the one-time code (docs/PARENT-ACCESS-RUNBOOK.md).

export default function RequestAccessPage() {
  const [email, setEmail] = useState("");
  const [parentName, setParentName] = useState("");
  const [note, setNote] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — humans never see this
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/access-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, parentName, note, website }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        setError(data.error ?? "Не получилось отправить. Попробуйте ещё раз.");
        setBusy(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Не получилось отправить. Попробуйте ещё раз.");
      setBusy(false);
    }
  };

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.18),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.14),transparent_30%)]" />

      <section className="relative z-10 w-full max-w-md rounded-[28px] border border-[var(--border-color)] bg-surface/90 p-8 shadow-[0_30px_120px_rgba(0,0,0,0.28)]">
        {sent ? (
          <div className="text-center">
            <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)]">
              <CheckCircle2 className="h-6 w-6 text-[var(--color-secondary-dark)]" aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-semibold text-[var(--ink)]">Заявка принята</h1>
            <p className="mt-3 text-sm leading-6 text-[var(--ink)]/64" aria-live="polite">
              Мы открываем доступ вручную, небольшими группами. Когда подойдёт ваша очередь,
              на указанную почту придёт письмо с кодом для ребёнка и ссылкой для родителя.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              На главную
            </Link>
          </div>
        ) : (
          <>
            <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)]">
              <ShieldCheck className="h-6 w-6 text-warning" aria-hidden="true" />
            </span>
            <h1 className="text-center text-2xl font-semibold text-[var(--ink)]">Заявка на доступ</h1>
            <p className="mt-3 text-center text-sm leading-6 text-[var(--ink)]/64">
              Закрытый бесплатный пилот. Оставьте родительскую почту — мы откроем доступ и
              пришлём код для ребёнка.
            </p>

            <form className="mt-7 space-y-4" onSubmit={submit} noValidate>
              <div className="space-y-1.5">
                <label htmlFor="ar-email" className="block text-sm font-medium text-[var(--text-secondary)]">
                  Почта родителя
                </label>
                <input
                  id="ar-email"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={ACCESS_REQUEST_LIMITS.email}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parent@example.com"
                  className="h-12 w-full rounded-2xl border border-[var(--border-color)] bg-surface-strong/90 px-4 text-base text-[var(--ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--ink)]/35 focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ar-name" className="block text-sm font-medium text-[var(--text-secondary)]">
                  Как к вам обращаться <span className="text-[var(--ink)]/45">(необязательно)</span>
                </label>
                <input
                  id="ar-name"
                  type="text"
                  autoComplete="name"
                  maxLength={ACCESS_REQUEST_LIMITS.parentName}
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  className="h-12 w-full rounded-2xl border border-[var(--border-color)] bg-surface-strong/90 px-4 text-base text-[var(--ink)] outline-none transition-[border-color,box-shadow] focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ar-note" className="block text-sm font-medium text-[var(--text-secondary)]">
                  Пара слов о запросе <span className="text-[var(--ink)]/45">(необязательно)</span>
                </label>
                <textarea
                  id="ar-note"
                  rows={3}
                  maxLength={ACCESS_REQUEST_LIMITS.note}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  aria-describedby="ar-note-hint"
                  className="w-full rounded-2xl border border-[var(--border-color)] bg-surface-strong/90 px-4 py-3 text-base text-[var(--ink)] outline-none transition-[border-color,box-shadow] focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30"
                />
                <p id="ar-note-hint" className="text-xs leading-5 text-[var(--text-muted)]">
                  Пожалуйста, не указывайте данные ребёнка — только ваш вопрос.
                </p>
              </div>

              {/* Honeypot: hidden from people and assistive tech, catches form-spam bots. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="pointer-events-none absolute h-0 w-0 opacity-0"
              />

              {error && (
                <p role="alert" className="text-sm font-medium text-error">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy || !email.trim()}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? "Отправляем…" : "Отправить заявку"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </form>

            <p className="mt-5 text-xs leading-5 text-[var(--text-muted)]">
              Мы храним только вашу почту и это сообщение, чтобы ответить. Данные ребёнка на
              этом шаге не собираются.
            </p>
            <div className="mt-4">
              <OperatorContactLine />
            </div>
          </>
        )}
      </section>
    </main>
  );
}
