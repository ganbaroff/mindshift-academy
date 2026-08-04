"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import type { TaskFamilyId } from "@/lib/tasks/types";
import {
  MASCOT_LINES,
  SESSION_COACH_STORAGE_KEY,
  sessionCoachFamilyTip,
} from "@/lib/guide";
import { MascotCue } from "./MascotCue";

type Props = {
  family: TaskFamilyId;
  /** Hide after first structured attempt / explicit dismiss. */
  forceHide?: boolean;
  onDismissed?: () => void;
};

function readDismissed(): boolean {
  try {
    return window.localStorage.getItem(SESSION_COACH_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(): void {
  try {
    window.localStorage.setItem(SESSION_COACH_STORAGE_KEY, "1");
  } catch {
    // storage unavailable — dismiss for this mount only
  }
}

const emptySubscribe = () => () => {};

/**
 * First-run session coach card (non-modal). Sits in the scroll area above TaskWorkspace —
 * never covers the sticky action bar.
 */
export function SessionCoach({ family, forceHide = false, onDismissed }: Props) {
  const storedDismissed = useSyncExternalStore(
    emptySubscribe,
    readDismissed,
    () => true
  );
  const [localDismissed, setLocalDismissed] = useState(false);

  const dismiss = useCallback(() => {
    writeDismissed();
    setLocalDismissed(true);
    onDismissed?.();
  }, [onDismissed]);

  const visible = !forceHide && !storedDismissed && !localDismissed;
  if (!visible) return null;

  const tip = sessionCoachFamilyTip(family);

  return (
    <aside
      data-testid="session-coach"
      aria-label="Как выполнить задание"
      className="space-y-3 rounded-2xl border border-primary/35 bg-primary/10 p-4"
    >
      <MascotCue beat="taskLook" className="justify-start" />
      <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 text-white/80">
        <li>{MASCOT_LINES.taskLook}</li>
        <li>{MASCOT_LINES.taskTap}</li>
        <li>{MASCOT_LINES.taskCheck}</li>
      </ol>
      <p className="text-sm font-medium text-primary-soft">{tip}</p>
      <button
        type="button"
        data-testid="session-coach-dismiss"
        onClick={dismiss}
        className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-primary px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
      >
        Понятно
      </button>
    </aside>
  );
}
