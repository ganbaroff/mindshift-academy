"use client";

import { useEffect, useRef, useState } from "react";
import { idleNudgeLevel, DEFAULT_NUDGE, type NudgeLevel, type NudgeThresholds } from "@/lib/guide";

// Escalating idle-nudge hook (spec §3): after inactivity, returns a rising nudge level (1 pulse →
// 2 replay voice → 3 demo) so the child is never left facing a silent, blank screen. Any pointer/
// key activity resets it. The level decision is the pure idleNudgeLevel() (tested in the gate);
// this hook is just the browser timer + reset wiring. `enabled=false` keeps it at 0.
export function useIdleNudge(thresholds: NudgeThresholds = DEFAULT_NUDGE, enabled = true): NudgeLevel {
  const [level, setLevel] = useState<NudgeLevel>(0);
  const startRef = useRef(0);

  const { pulseMs, voiceMs, demoMs } = thresholds;

  useEffect(() => {
    if (!enabled) return; // disabled → the hook derives 0 in its return, no setState needed here
    const t = { pulseMs, voiceMs, demoMs };
    let timer = 0;
    const reset = () => {
      startRef.current = performance.now();
      setLevel(0);
    };
    const tick = () => {
      setLevel(idleNudgeLevel(performance.now() - startRef.current, t));
      timer = window.setTimeout(tick, 1000);
    };
    reset();
    timer = window.setTimeout(tick, 1000);
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "pointermove"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    return () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [enabled, pulseMs, voiceMs, demoMs]);

  return enabled ? level : 0;
}
