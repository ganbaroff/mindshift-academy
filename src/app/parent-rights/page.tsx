import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { OperatorContactLine } from "@/components/support/OperatorContactLine";

export const metadata = {
  title: "Права родителя (черновик) — MindShift Academy",
};

function loadDraft(): string {
  try {
    return readFileSync(
      join(process.cwd(), "docs/legal/CHERNOVIK-parent-rights-ru.md"),
      "utf8"
    );
  } catch {
    return "Черновик временно недоступен.";
  }
}

export default function ParentRightsPage() {
  const md = loadDraft();
  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] px-6 py-10 text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
          ЧЕРНОВИК — требует подтверждения юриста.
        </p>
        <h1 className="text-3xl font-semibold">Права родителя</h1>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-white/80">{md}</pre>
        <OperatorContactLine />
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-primary-soft underline">
            Конфиденциальность
          </Link>
          <Link href="/dashboard" className="text-primary-soft underline">
            Дашборд
          </Link>
        </div>
      </div>
    </main>
  );
}
