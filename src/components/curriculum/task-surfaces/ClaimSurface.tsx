"use client";

import { useState } from "react";
import type { PublicClaim } from "@/content/curriculum/types";
import type { StructuredProgram } from "@/lib/tasks/schemas";

type Props = {
  claims: PublicClaim[];
  disabled: boolean;
  onSubmit: (program: StructuredProgram) => void | Promise<void>;
};

export function ClaimSurface({ claims, disabled, onSubmit }: Props) {
  const [labels, setLabels] = useState<Record<string, boolean>>({});
  const complete = claims.length > 0 && claims.every((claim) => Object.hasOwn(labels, claim.id));

  return (
    <form
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
          <fieldset key={claim.id} disabled={disabled} className="rounded-xl border border-slate-700 bg-slate-900/70 p-3">
            <legend className="px-1 font-medium text-white">Утверждение: {claim.text}</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-600 px-3">
                <input type="radio" name={`claim-${index}`} checked={labels[claim.id] === true} onChange={() => setLabels((current) => ({ ...current, [claim.id]: true }))} />
                Верно
              </label>
              <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-600 px-3">
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
        className="min-h-11 w-full rounded-xl bg-violet-500 px-6 py-3 font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Проверить
      </button>
    </form>
  );
}
