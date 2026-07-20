"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, ShieldCheck } from "lucide-react";

// Parent activation screen (spec §0 posture B). The parent opens this once on their OWN device
// from the link they were given, sees which child-account email it authorizes, ticks the two
// consent opt-ins (copied VERBATIM from src/app/consent/page.tsx so the disclosure is identical),
// and activates the code. The child never sees this screen — they only type the code.

// VERBATIM from src/app/consent/page.tsx `ru.optA` / `ru.optB` — keep byte-identical for legal
// consistency. If the consent copy changes there, change it here too.
const OPT_A =
  "Я родитель/опекун и даю согласие на сбор и использование данных моего ребёнка для обучения в MindShift Academy.";
const OPT_B =
  "Я согласен(на), что сообщения ребёнка обрабатываются автоматической системой безопасности и внешним ИИ-провайдером (NVIDIA, США) для работы тьютора.";

function ActivateInner() {
  const token = useSearchParams().get("t") ?? "";
  const [email, setEmail] = useState<string | null>(null);
  const [optA, setOptA] = useState(false);
  const [optB, setOptB] = useState(false);
  const [busy, setBusy] = useState(false);
  // Initialise from token presence so the effect never does a synchronous setState (it only
  // syncs the async fetch result — the documented external-sync exception).
  const [state, setState] = useState<"loading" | "form" | "done" | "error">(token ? "loading" : "error");
  const [error, setError] = useState<string | null>(
    token ? null : "Ссылка неполная. Откройте её из письма целиком."
  );

  useEffect(() => {
    if (!token) return;
    fetch(`/api/access-code/activate?t=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        setEmail(d.email);
        setState(d.status === "redeemed" ? "error" : "form");
        if (d.status === "redeemed") setError("Этот код уже использован ребёнком.");
      })
      .catch(() => {
        setState("error");
        setError("Ссылка недействительна или устарела.");
      });
  }, [token]);

  const submit = async () => {
    if (!optA || !optB || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/access-code/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activationToken: token, serviceConsent: optA, externalAiConsent: optB }),
      });
      if (r.ok) {
        setState("done");
        return;
      }
      const d = await r.json().catch(() => ({}));
      setError(d.code === "BOTH_CONSENTS_REQUIRED" ? "Нужны обе галочки." : "Не удалось. Попробуйте ещё раз.");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  if (state === "loading") {
    return (
      <main className="grid min-h-screen place-items-center text-white/70">
        <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />
      </main>
    );
  }
  if (state === "error") {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <p className="max-w-md text-error">{error}</p>
      </main>
    );
  }
  if (state === "done") {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center">
        <div className="max-w-md space-y-3">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <p className="text-2xl font-semibold text-white">Готово ✅</p>
          <p className="text-white/70">
            Код активирован. Передайте его ребёнку — он войдёт сам, вам больше ничего делать не нужно.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <ShieldCheck className="mx-auto h-10 w-10 text-primary" />
          <h1 className="text-2xl font-semibold text-white">Разрешение для ребёнка</h1>
          <p className="text-sm text-white/60">
            Вы даёте согласие для аккаунта <strong className="text-white">{email}</strong>. Ребёнок будет
            заниматься сам; вам нужно подтвердить только один раз.
          </p>
        </div>

        <fieldset className="space-y-3">
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/78 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/[0.08]">
            <input
              type="checkbox"
              checked={optA}
              onChange={(e) => setOptA(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--color-primary)]"
            />
            <span>{OPT_A}</span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/78 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/[0.08]">
            <input
              type="checkbox"
              checked={optB}
              onChange={(e) => setOptB(e.target.checked)}
              className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--color-primary)]"
            />
            <span>{OPT_B}</span>
          </label>
        </fieldset>

        {error && (
          <p role="alert" className="text-sm text-error">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={submit}
          disabled={busy || !optA || !optB}
          className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="h-4 w-4" />}
          Подтвердить и активировать код
        </button>
      </div>
    </main>
  );
}

export default function ActivatePage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center text-white/70">
          <Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />
        </main>
      }
    >
      <ActivateInner />
    </Suspense>
  );
}
