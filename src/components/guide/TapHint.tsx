// A pulsing "tap here" ring over the current target (spec §3). Language-independent cue — works
// for the youngest/slow readers. Purely decorative (aria-hidden) and pointer-transparent so it
// never blocks the tap it's pointing at. Respects prefers-reduced-motion (no ping animation).
export function TapHint({ show = true, className = "" }: { show?: boolean; className?: string }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className={`pointer-events-none absolute inset-0 -z-0 grid place-items-center ${className}`}
    >
      <span className="absolute h-full w-full rounded-2xl bg-primary/20 motion-safe:animate-ping" />
      <span className="absolute h-full w-full rounded-2xl ring-2 ring-primary/70" />
    </span>
  );
}
