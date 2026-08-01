/**
 * Choice-mode fallback when the interpreter is down.
 * Deterministic option tiles derived from server task payloads — never from AI.
 * Lets a child complete the session without a live provider (red gate #7).
 */

import type { ContentTask } from "@/content/curriculum/types";
import type { Cell, GridProgram, SequenceProgram } from "@/lib/tasks/types";
import type { RuleProgram } from "@/lib/tasks/rule-runner";
import type { PatternProgram } from "@/lib/tasks/pattern-expand";
import type { ClaimCheckProgram } from "@/lib/tasks/claim-check";

export type ChoiceOption = {
  id: string;
  labelRu: string;
};

export type ChoiceProgram =
  | GridProgram
  | SequenceProgram
  | RuleProgram
  | PatternProgram
  | ClaimCheckProgram;

const PASSING_SEQUENCE: string[] = [
  "взять_нож",
  "положить_хлеб",
  "намазать_масло",
  "положить_сыр",
  "накрыть_хлебом",
  "подать",
];

export function buildChoiceOptions(task: ContentTask): ChoiceOption[] {
  switch (task.family) {
    case "grid-draw":
      return [
        { id: "exact-target", labelRu: "Закрась ровно целевые клетки" },
        { id: "empty", labelRu: "Ничего не закрашивай" },
      ];
    case "sequence-world":
      return [
        { id: "full-sandwich", labelRu: "Собери бутерброд по шагам" },
        { id: "skip", labelRu: "Пропусти шаги" },
      ];
    case "rule-runner":
      return [
        { id: "safe-rules", labelRu: "Правило с проверкой впереди" },
        { id: "blind-step", labelRu: "Всегда только шаг" },
      ];
    case "pattern-expand":
      return [
        { id: "match-expected", labelRu: "Продолжи узор по правилу" },
        { id: "wrong-list", labelRu: "Перечисли наугад" },
      ];
    case "claim-check":
      return [
        { id: "truthful", labelRu: "Отметь верные и ложные утверждения" },
        { id: "all-true", labelRu: "Считай всё верным" },
      ];
    default:
      return [{ id: "retry", labelRu: "Попробовать ещё раз" }];
  }
}

/** Resolve a choice into a closed program for the deterministic checker. */
export function programForChoice(
  task: ContentTask,
  choiceId: string
): ChoiceProgram | null {
  switch (task.family) {
    case "grid-draw": {
      if (choiceId === "exact-target" && task.target) {
        return { status: "ok", cells: task.target.map((c) => [...c] as Cell) };
      }
      if (choiceId === "empty") {
        return { status: "ok", cells: [] };
      }
      return null;
    }
    case "sequence-world": {
      if (choiceId === "full-sandwich") {
        return { status: "ok", steps: [...PASSING_SEQUENCE] };
      }
      if (choiceId === "skip") {
        return { status: "ok", steps: ["подать"] };
      }
      return null;
    }
    case "rule-runner": {
      if (choiceId === "safe-rules") {
        return {
          status: "ok",
          rules: [
            { if: { kind: "tile", value: "open" }, then: "step" },
            { if: { kind: "tile", value: "goal" }, then: "step" },
            { if: { kind: "tile", value: "wall" }, then: "wait" },
            { if: { kind: "tile", value: "trap" }, then: "stop" },
            { if: { kind: "always" }, then: "wait" },
          ],
        };
      }
      if (choiceId === "blind-step") {
        return {
          status: "ok",
          rules: [{ if: { kind: "always" }, then: "step" }],
        };
      }
      return null;
    }
    case "pattern-expand": {
      if (choiceId === "match-expected" && task.patternExpected?.length) {
        const nums = task.patternExpected.map((x) => Number(x));
        if (nums.every((n) => !Number.isNaN(n)) && nums.length >= 2) {
          return {
            status: "ok",
            rule: {
              kind: "arithmetic",
              start: nums[0],
              step: nums[1] - nums[0],
            },
          };
        }
        return {
          status: "ok",
          rule: { kind: "cycle", items: [...task.patternExpected] },
        };
      }
      if (choiceId === "wrong-list") {
        return { status: "ok", rule: { kind: "cycle", items: ["x"] } };
      }
      return null;
    }
    case "claim-check": {
      if (!task.claims) return null;
      if (choiceId === "truthful") {
        const labels: Record<string, boolean> = {};
        for (const c of task.claims) labels[c.id] = c.truth;
        return { status: "ok", labels };
      }
      if (choiceId === "all-true") {
        const labels: Record<string, boolean> = {};
        for (const c of task.claims) labels[c.id] = true;
        return { status: "ok", labels };
      }
      return null;
    }
    default:
      return null;
  }
}

/** Choice ids that should pass the deterministic checker for a well-authored task. */
export function passingChoiceId(task: ContentTask): string {
  switch (task.family) {
    case "grid-draw":
      return "exact-target";
    case "sequence-world":
      return "full-sandwich";
    case "rule-runner":
      return "safe-rules";
    case "pattern-expand":
      return "match-expected";
    case "claim-check":
      return "truthful";
    default:
      return "retry";
  }
}
