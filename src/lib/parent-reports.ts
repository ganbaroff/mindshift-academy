/**
 * Weekly report v2 + parent completion letter — mastery per skill,
 * struggled-most concept, dinner question from the week's misconception.
 * Never includes raw child text.
 */

import { FIVE_CONCEPTS, skillLabelsRu } from "@/lib/certificate-skills";
import { WEEK_CONCEPT, WEEK_SESSIONS } from "@/lib/evolution";
import { getSession } from "@/content/curriculum";

export type SkillMasteryRow = {
  concept: string;
  labelRu: string;
  mastery: number;
};

export type WeeklyReportV2Snapshot = {
  week: 1 | 2 | 3 | 4 | 5;
  masteryPerSkill: SkillMasteryRow[];
  /** Lowest mastery among the five (ties → first in FIVE_CONCEPTS order) */
  struggledMost: SkillMasteryRow;
  dinnerQuestionRu: string;
  misconceptionRu: string;
};

export type CompletionLetterSnapshot = {
  masteryPerSkill: SkillMasteryRow[];
  certificateId: string;
  recipientLabel: string;
  monsterName: string;
  issuedDayBucket: string;
};

export function buildMasteryRows(
  masteryByConcept: Record<string, number>
): SkillMasteryRow[] {
  const labels = skillLabelsRu();
  return FIVE_CONCEPTS.map((concept) => ({
    concept,
    labelRu: labels[concept],
    mastery: masteryByConcept[concept] ?? 0,
  }));
}

export function pickStruggledMost(rows: SkillMasteryRow[]): SkillMasteryRow {
  return rows.reduce((worst, row) => (row.mastery < worst.mastery ? row : worst));
}

/** Dinner question + misconception from the week's last session card. */
export function weekDinnerContext(week: 1 | 2 | 3 | 4 | 5): {
  dinnerQuestionRu: string;
  misconceptionRu: string;
} {
  const lastId = WEEK_SESSIONS[week][2];
  const session = getSession(lastId);
  return {
    dinnerQuestionRu: session?.dinnerQuestionRu ?? "",
    misconceptionRu: session?.misconception ?? WEEK_CONCEPT[week],
  };
}

export function buildWeeklyReportV2(
  week: 1 | 2 | 3 | 4 | 5,
  masteryByConcept: Record<string, number>
): WeeklyReportV2Snapshot {
  const masteryPerSkill = buildMasteryRows(masteryByConcept);
  const { dinnerQuestionRu, misconceptionRu } = weekDinnerContext(week);
  return {
    week,
    masteryPerSkill,
    struggledMost: pickStruggledMost(masteryPerSkill),
    dinnerQuestionRu,
    misconceptionRu,
  };
}

export function buildCompletionLetter(input: {
  masteryByConcept: Record<string, number>;
  certificateId: string;
  recipientLabel: string;
  monsterName: string;
  issuedDayBucket: string;
}): CompletionLetterSnapshot {
  return {
    masteryPerSkill: buildMasteryRows(input.masteryByConcept),
    certificateId: input.certificateId,
    recipientLabel: input.recipientLabel,
    monsterName: input.monsterName,
    issuedDayBucket: input.issuedDayBucket,
  };
}
