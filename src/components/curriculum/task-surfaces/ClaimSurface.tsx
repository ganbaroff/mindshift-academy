"use client";

import { useEffect, useState } from "react";
import type { PublicClaim } from "@/content/curriculum/types";
import type { StructuredProgram } from "@/lib/tasks/schemas";
import { PRIMARY_ACTION_HIDDEN, type TaskPrimaryActionProps } from "./primary-action";

type Props = TaskPrimaryActionProps & {
  claims: PublicClaim[];
  disabled: boolean;
  onSubmit: (program: StructuredProgram) => void | Promise<void>;
};

export function ClaimSurface({
  formId,
  hidePrimaryAction,
  onSubmitReadyChange,
  claims,
  disabled,
  onSubmit,
}: Props) {
  const [labels, setLabels] = useState<Record<string, boolean>>({});
  const complete = claims.length > 0 && claims.every((claim) => Object.hasOwn(labels, claim.id));

  useEffect(() => {
    onSubmitReadyChange?.(complete);
  }, [complete, onSubmitReadyChange]);

  return (
    <form
      id={formId}
      aria-label="Проверка утверждений"
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!complete) return;
        void onSubmit({ status: "ok", labels });
      }}
    >
      <div className="space-y-3">
        {claims.map((claim, index) => (
          <fieldset key={claim.id} disabled={disabled} className="rounded-xl border border-[var(--border-color)] bg-[var(--surface)]/70 p-3">
            <legend className="px-1 font-medium text-[var(--ink)]">Утверждение: {claim.text}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--border-color)] px-3">
                <input type="radio" name={`claim-${index}`} checked={labels[claim.id] === true} onChange={() => setLabels((current) => ({ ...current, [claim.id]: true }))} />
                Верно
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-[var(--border-color)] px-3">
                <input type="radio" name={`claim-${index}`} checked={labels[claim.id] === false} onChange={() => setLabels((current) => ({ ...current, [claim.id]: false }))} />
                Неверно
              </label>
            </div>
          </fieldset>
        ))}
      </div>
      <button
        type="submit"
        data-primary-action="true"
        disabled={disabled || !complete}
        className={`min-h-11 w-full rounded-xl bg-[var(--color-primary)] px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-secondary-dark)] disabled:cursor-not-allowed disabled:opacity-50 ${hidePrimaryAction ? PRIMARY_ACTION_HIDDEN : ""}`}
      >
        Проверить
      </button>
    </form>
  );
}
