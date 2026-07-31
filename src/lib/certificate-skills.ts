/** Client-safe skill labels — no Node crypto. */

export const FIVE_CONCEPTS = [
  "precision",
  "decomposition",
  "conditions",
  "pattern",
  "verification",
] as const;

export type ConceptId = (typeof FIVE_CONCEPTS)[number];

export function skillLabelsRu(): Record<ConceptId, string> {
  return {
    precision: "Точная инструкция",
    decomposition: "Разбиение на шаги",
    conditions: "Условия и крайние случаи",
    pattern: "Закономерность как правило",
    verification: "Проверка и отладка",
  };
}
