import type { TaskFamilyId } from "@/lib/tasks/types";
import { WORKED_EXAMPLES } from "./examples";

type Props = {
  family: TaskFamilyId;
  initiallyOpen?: boolean;
};

export function WorkedExample({ family, initiallyOpen = false }: Props) {
  const example = WORKED_EXAMPLES[family];

  return (
    <details
      open={initiallyOpen}
      className="rounded-2xl border border-violet-400/30 bg-violet-400/10 p-4"
    >
      <summary className="min-h-11 cursor-pointer py-2 font-semibold text-[var(--color-primary-dark)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-secondary-dark)]">
        Пример с другими данными
      </summary>
      <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-primary)]">
        <p><strong className="text-[var(--ink)]">Что нужно:</strong> {example.situation}</p>
        <p><strong className="text-[var(--ink)]">Что делаем:</strong> {example.action}</p>
        <p><strong className="text-[var(--ink)]">Что получится:</strong> {example.result}</p>
      </div>
    </details>
  );
}
