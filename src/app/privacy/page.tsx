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

        {/* CC BY 4.0 requires attribution and we were shipping none. The monster's four
            animated faces in public/lottie/ are byte-identical to Google's Noto Animated
            Emoji (verified 2026-09-06 by SHA-256 against
            fonts.gstatic.com/s/e/notoemoji/latest/<codepoint>/lottie.json). Provenance for
            every shipped asset: docs/legal/ASSET-PROVENANCE.md. One notice on a stable page
            is the practice the Noto downstream packages follow — per-emoji credit is not
            workable on a child's screen. */}
        <section
          data-testid="third-party-notices"
          aria-labelledby="third-party-notices-heading"
          className="space-y-1 border-t border-[var(--border-color)] pt-4"
        >
          <h2
            id="third-party-notices-heading"
            className="text-sm font-semibold text-[var(--text-primary)]"
          >
            Сторонние материалы
          </h2>
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            Анимации лица монстра — Animated Noto Emoji, © Google LLC, лицензия{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              rel="noopener noreferrer"
              target="_blank"
              className="text-[var(--color-secondary-dark)] underline"
            >
              CC BY 4.0
            </a>
            . Шрифты Comfortaa, Nunito и Geist Mono — SIL Open Font License 1.1. Иконки
            lucide — лицензия ISC.
          </p>
        </section>

        <Link href="/dashboard" className="text-sm text-[var(--color-secondary-dark)] underline">
          ← К дашборду
        </Link>
      </div>
    </main>
  );
}
