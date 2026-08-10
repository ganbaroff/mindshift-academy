"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useSignIn } from "@clerk/nextjs";
import { ArrowRight } from "lucide-react";
import { MascotCue } from "@/components/guide/MascotCue";
import { TapHint } from "@/components/guide/TapHint";
import { SignedInContinue } from "@/components/access/SignedInContinue";

// Child code-entry screen (spec §2/§3). Kid-friendly segmented input: one big box per character,
// auto-advance, paste-friendly, uppercase, ambiguous-char-free alphabet. On a valid code the
// redeem route returns a Clerk sign-in ticket which we consume silently (no password, no form) and
// land the child on /onboarding — where the existing hatch+name flow continues.

const LEN = 8;
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const clean = (s: string) =>
  (s || "")
    .toUpperCase()
    .split("")
    .filter((c) => ALPHABET.includes(c))
    .join("");

export default function EnterCodePage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  // Installed Clerk exposes the futures/signals sign-in API: useSignIn() -> { signIn } where
  // signIn is a nullable SignInFutureResource with a dedicated ticket() method + finalize().
  const { signIn } = useSignIn();
  const [chars, setChars] = useState<string[]>(Array(LEN).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const setAt = (i: number, raw: string) => {
    const cc = clean(raw);
    setChars((prev) => {
      const next = [...prev];
      if (cc.length <= 1) {
        next[i] = cc;
        if (cc && i < LEN - 1) boxes.current[i + 1]?.focus();
      } else {
        // Paste / multi-char: distribute from the current box.
        for (let k = 0; k < LEN - i; k++) next[i + k] = cc[k] ?? next[i + k];
        boxes.current[Math.min(i + cc.length, LEN - 1)]?.focus();
      }
      return next;
    });
  };

  const submit = async () => {
    const code = chars.join("");
    if (code.length !== LEN || !signIn || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/access-code/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.ok) {
        setError(d.error ?? "Код не подошёл.");
        setBusy(false);
        return;
      }
      // Silently consume the Backend-minted ticket (no password/form), then finalize the session.
      const { error: ticketError } = await signIn.ticket({ ticket: d.ticket });
      if (ticketError) {
        setError("Не удалось войти. Попробуй ещё раз.");
        setBusy(false);
        return;
      }
      await signIn.finalize();
      router.push("/onboarding");
    } catch {
      setError("Что-то пошло не так. Попробуй ещё раз.");
      setBusy(false);
    }
  };

  if (isLoaded && isSignedIn) {
    return (
      <main className="grid min-h-screen place-items-center px-6 py-12">
        <SignedInContinue variant="replace-form" />
        <p className="mt-6 text-sm text-white/50" aria-live="polite">
          Ищем, где ты остановился…
        </p>
      </main>
    );
  }

  return (
    <main className="grid min-h-screen place-items-center px-6 py-12">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-white">Введи 8-символьный код ребёнка</h1>
          {/* Voiced instruction in the pet's voice + a caption — reading optional (spec §3). */}
          <MascotCue beat="code" />
          <p id="child-code-help" className="text-sm leading-6 text-white/60">
            Этот код взрослый получает по приглашению и передаёт тебе. Если кода нет, попроси взрослого проверить приглашение.
          </p>
        </div>

        <div
          className="mx-auto grid w-fit grid-cols-4 gap-2 sm:flex sm:justify-center sm:gap-1.5"
          onPaste={(e) => {
            e.preventDefault();
            setAt(0, e.clipboardData.getData("text"));
          }}
        >
          {chars.map((c, i) => (
            <input
              key={i}
              ref={(el) => {
                boxes.current[i] = el;
              }}
              value={c}
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={1}
              aria-label={`Символ ${i + 1}`}
              aria-describedby="child-code-help"
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !chars[i] && i > 0) boxes.current[i - 1]?.focus();
              }}
              // 56px on a phone, 44px in the desktop row. Was h-12 w-8 — 32px wide, under
              // the 44px minimum, on the one control an unsupervised child must use to get
              // in. Reported in docs/design-handoff/v1.1/02-CURRENT-STATE.md and open since.
              // The space was always there: at 320px the page has 272px inside its px-6,
              // and four 56px boxes with 8px gaps need 248px.
              className="h-14 w-14 rounded-xl border border-white/15 bg-surface-strong/90 text-center text-xl font-bold uppercase text-white outline-none transition-[border-color,box-shadow] focus-visible:border-primary/70 focus-visible:ring-2 focus-visible:ring-primary/30 sm:h-14 sm:w-11"
            />
          ))}
        </div>

        {error && (
          <p role="alert" className="text-sm font-medium text-error">
            {error}
          </p>
        )}

        {/* Once all 8 chars are in, pulse the button so the child knows to press it (spec §3). */}
        <span className="relative inline-flex w-full">
          <TapHint show={chars.join("").length === LEN && !busy} />
          <button
            type="button"
            onClick={submit}
            disabled={busy || chars.join("").length !== LEN}
            className="relative z-10 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Заходим…" : "Продолжить"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </span>
      </div>
    </main>
  );
}
