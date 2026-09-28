import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { OperatorContactLine } from "@/components/support/OperatorContactLine";

export const metadata = {
  title: "Права родителя — MindShift Academy",
};

// Versioned document under docs/legal/, rendered verbatim (same rule as /privacy).
function loadRights(): string {
  try {
    return readFileSync(
      join(process.cwd(), "docs/legal/PARENT-RIGHTS-ru.md"),
      "utf8"
    );
  } catch {
    return "Текст временно недоступен. Напишите оператору — контакт ниже.";
  }
}

export default function ParentRightsPage() {
  const md = loadRights();
  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] px-6 py-10 text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl space-y-6">
        <p
          data-testid="legal-status"
          className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-secondary)]"
        >
          Редакция 1.0 от 28.09.2026. Права следуют из статьи 7 Закона АР «О персональных
          данных»; внешним юристом не заверялась.
        </p>
        <h1 className="text-3xl font-semibold">Права родителя</h1>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--text-secondary)]">{md}</pre>
        <OperatorContactLine />
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-[var(--color-secondary-dark)] underline">
            Конфиденциальность
          </Link>
          <Link href="/dashboard" className="text-[var(--color-secondary-dark)] underline">
            Дашборд
          </Link>
        </div>
      </div>
    </main>
  );
}
