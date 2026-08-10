import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { OperatorContactLine } from "@/components/support/OperatorContactLine";

export const metadata = {
  title: "Конфиденциальность (черновик) — MindShift Academy",
};

function loadDraft(): string {
  try {
    return readFileSync(
      join(process.cwd(), "docs/legal/CHERNOVIK-privacy-notice-ru.md"),
      "utf8"
    );
  } catch {
    return "Черновик временно недоступен.";
  }
}

export default function PrivacyPage() {
  const md = loadDraft();
  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] px-6 py-10 text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="rounded-xl border border-amber-500/40 bg-[var(--color-accent)] px-4 py-3 text-sm text-[#3A2600]">
          ЧЕРНОВИК — требует подтверждения юриста. Не является действующей политикой.
        </p>
        <h1 className="text-3xl font-semibold">Уведомление о конфиденциальности</h1>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--text-secondary)]">{md}</pre>
        <OperatorContactLine />
        <Link href="/dashboard" className="text-sm text-[var(--color-secondary-dark)] underline">
          ← К дашборду
        </Link>
      </div>
    </main>
  );
}
