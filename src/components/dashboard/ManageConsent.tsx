"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldOff, Loader2, Trash2 } from "lucide-react";

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
  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleted, setDeleted] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/consent/status");
      setStatus(await res.json());
    } catch {
      setStatus(null);
    }
  }

  useEffect(() => {
    // Fetch the current consent state once on mount. setStatus runs only AFTER the awaited
    // fetch inside load(), so this is a normal data-load, not a synchronous cascading render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  async function deleteAcademyData() {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/child-data", { method: "DELETE" });
      if (!response.ok) throw new Error("delete failed");
      setDeleted(true);
    } catch {
      setDeleteError("Не удалось удалить данные. Попробуйте ещё раз или напишите в поддержку.");
    } finally {
      setDeleteBusy(false);
    }
  }

  const valid = status?.valid === true;

  if (deleted) {
    return (
      <section className="rounded-[28px] border border-[var(--border-color)] bg-surface/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
        <h2 className="text-2xl font-semibold text-[var(--ink)]">Данные Academy удалены</h2>
        <p role="status" className="mt-3 text-sm leading-6 text-[var(--ink)]/64">
          Прогресс, питомец, инвентарь и записи согласия удалены. Ваш родительский аккаунт Clerk не удалён.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-[44px] items-center rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
        >
          На главную
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-[var(--border-color)] bg-surface/90 p-6 shadow-[0_24px_90px_rgba(0,0,0,0.24)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--ink)]/45">
            Родительское согласие
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--ink)]">Управление доступом ребёнка</h2>
        </div>
        {valid ? (
          <ShieldCheck className="h-5 w-5 text-secondary" aria-hidden />
        ) : (
          <ShieldOff className="h-5 w-5 text-warning" aria-hidden />
        )}
      </div>

      <p className="mt-4 text-sm leading-6 text-[var(--ink)]/64">
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
                className="inline-flex min-h-[44px] items-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-strong)]"
              >
                Отмена
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
            >
              <ShieldOff className="h-4 w-4" />
              Отозвать согласие
            </button>
          )
        ) : (
          <Link
            href="/consent"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
          >
            <ShieldCheck className="h-4 w-4" />
            Подтвердить согласие
          </Link>
        )}
      </div>

      <div className="mt-6 border-t border-[var(--border-color)] pt-6">
        <p className="text-sm font-semibold text-[var(--ink)]">Удалить данные ребёнка</p>
        <p className="mt-2 text-sm leading-6 text-[var(--ink)]/58">
          Удалятся прогресс, питомец, инвентарь и записи согласия в Academy. Родительский аккаунт останется, но это действие нельзя отменить.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          {deleteConfirming ? (
            <>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={deleteAcademyData}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-error/40 bg-error/10 px-5 py-3 text-sm font-semibold text-error transition-colors hover:bg-error/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/60 disabled:opacity-50"
              >
                {deleteBusy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <Trash2 className="h-4 w-4" />}
                Да, удалить навсегда
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setDeleteConfirming(false)}
                className="inline-flex min-h-[44px] items-center rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-strong)]"
              >
                Отмена
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setDeleteConfirming(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-error/30 bg-transparent px-5 py-3 text-sm font-semibold text-error transition-colors hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/60"
            >
              <Trash2 className="h-4 w-4" />
              Удалить данные ребёнка
            </button>
          )}
        </div>
        {deleteError && <p role="alert" className="mt-3 text-sm text-error">{deleteError}</p>}
      </div>
    </section>
  );
}
