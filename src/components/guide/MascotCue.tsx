"use client";

import { Volume2 } from "lucide-react";
import { mascotLine } from "@/lib/guide";

// Mascot instruction (spec §3): the pet "speaks" a short line AND shows it as a caption. Reading
// is optional (caption for readers, voice for non-readers). Sound is OPT-IN — tap the speaker —
// so it's school-friendly and never auto-blasts. Pass a `beat` key (mapped in src/lib/guide.ts)
// or an explicit `text`.
export function MascotCue({
  beat,
  text,
  className = "",
}: {
  beat?: string;
  text?: string;
  className?: string;
}) {
  const line = text ?? mascotLine(beat ?? "");

  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(line);
    u.lang = "ru-RU";
    u.rate = 0.95; // a touch slower — clearer for a child
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  };

  return (
    <div className={`flex items-center justify-center gap-2 text-center ${className}`}>
      <button
        type="button"
        onClick={speak}
        aria-label="Прослушать подсказку"
        // 44px, not 32. This is the read-aloud button — the control a child who cannot
        // read well depends on most, and it was the smallest target on the screen.
        className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/12 bg-white/[0.04] text-primary-soft transition-[background-color,scale] duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.94] hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
      >
        <Volume2 className="h-4 w-4" />
      </button>
      <p className="text-sm font-medium text-white/75">{line}</p>
    </div>
  );
}
