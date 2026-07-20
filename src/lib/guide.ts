// PURE guidance logic for the "lead the child by the hand" runtime (spec §3). Dependency-free so
// the deterministic gate can exercise it (like progression.ts). The React primitives in
// src/components/guide/* consume these.

export type NudgeLevel = 0 | 1 | 2 | 3; // 0 none · 1 pulse the target · 2 replay voice · 3 demo/big hand

export interface NudgeThresholds {
  pulseMs: number; // start pulsing the target
  voiceMs: number; // replay the mascot voice line
  demoMs: number; // escalate to a bigger "let me show you" hand/demo
}

export const DEFAULT_NUDGE: NudgeThresholds = { pulseMs: 6000, voiceMs: 15000, demoMs: 30000 };

/**
 * Escalating idle nudge (spec §3, research: "never a silent, blank screen"). Given how long the
 * child has been idle, returns which nudge to show. Monotonic and capped at 3 so it never spams
 * beyond the "let me show you" demo. A gentle timer, NOT a punishment.
 */
export function idleNudgeLevel(idleMs: number, t: NudgeThresholds = DEFAULT_NUDGE): NudgeLevel {
  if (idleMs >= t.demoMs) return 3;
  if (idleMs >= t.voiceMs) return 2;
  if (idleMs >= t.pulseMs) return 1;
  return 0;
}

// Mascot voice/caption lines, in the pet's voice, RU (matches the app interior). Each guided beat
// has a short spoken line + the same text as a caption — reading is optional, never required.
export const MASCOT_LINES: Record<string, string> = {
  land: "Привет! Давай разбудим твоего монстра.",
  code: "Впиши секретный код, который дал тебе взрослый.",
  hatch: "Нажми на яйцо — и я проснусь!",
  name: "Придумай мне имя!",
  lessonStart: "Напиши мне — и я оживу!",
};

/** The mascot line for a beat, or a safe generic nudge if the beat is unknown. */
export function mascotLine(beat: string): string {
  return MASCOT_LINES[beat] ?? "Попробуй нажать на подсвеченную кнопку!";
}
