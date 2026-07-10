"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldOff, Loader2 } from "lucide-react";

// Parental consent management (docs/COPPA-CONSENT-SPEC.md §7). Shows the current consent state
// and lets the parent REVOKE — which sets revokedAt and immediately blocks the child chat.
type ConsentStatus = {
  exists: boolean;
  verified: boolean;
  serviceConsent: boolean;
  externalAiConsent: boolean;
  revoked: boolean;
  current: boolean;
  valid: boolean;
  parentEmail: string | null;
};

export function ManageConsent() {
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/consent/status");
      setStatus(await res.json());
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function revoke() {
    setBusy(true);
    try {
      await fetch("/api/consent/revoke", { method: "POST" });
      await load();
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  const valid = status?.valid === true;

  return (
    <section className="rounded-[28px] border border-white/10 bg-surface/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
            Родительское согласие
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Управление доступом ребёнка</h2>
        </div>
        {valid ? (
          <ShieldCheck className="h-5 w-5 text-secondary" aria-hidden />
        ) : (
          <ShieldOff className="h-5 w-5 text-warning" aria-hidden />
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-white/64">
        {valid
          ? `Согласие активно${status?.parentEmail ? ` (${status.parentEmail})` : ""}. Чат ребёнка включён. Вы можете отозвать согласие в любой момент — тогда чат сразу отключится.`
          : status?.revoked
            ? "Согласие отозвано. Чат ребёнка отключён. Чтобы снова включить, подтвердите согласие заново."
            : "Согласие ещё не подтверждено. Чат ребёнка будет недоступен, пока вы не подтвердите согласие."}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {valid ? (
          confirming ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={revoke}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-error/40 bg-error/10 px-5 py-3 text-sm font-semibold text-error transition-colors hover:bg-error/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/60 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <ShieldOff className="h-4 w-4" />}
                Да, отозвать согласие
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="inline-flex min-h-[44px] items-center rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.08]"
              >
                Отмена
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white/80 transition-colors hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <ShieldOff className="h-4 w-4" />
              Отозвать согласие
            </button>
          )
        ) : (
          <Link
            href="/consent"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <ShieldCheck className="h-4 w-4" />
            Подтвердить согласие
          </Link>
        )}
      </div>
    </section>
  );
}
