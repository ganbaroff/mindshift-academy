import type { ReactNode } from "react";

// Step-gating (spec §3, Duolingo ABC): only the ACTIVE step is interactive; the rest is dimmed +
// non-interactive so the child can't wander off and get lost. Advance by flipping `active`, not by
// a mis-pressable "Next" button.
export function StepGate({
  active,
  children,
  className = "",
}: {
  active: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      aria-hidden={!active}
      className={`transition-opacity motion-reduce:transition-none ${
        active ? "opacity-100" : "pointer-events-none select-none opacity-40"
      } ${className}`}
    >
      {children}
    </div>
  );
}
