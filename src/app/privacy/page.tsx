import { readFileSync } from "node:fs";
import { join } from "node:path";
import Link from "next/link";
import { OperatorContactLine } from "@/components/support/OperatorContactLine";

export const metadata = {
  title: "Конфиденциальность — MindShift Academy",
};

// The notice is a versioned document under docs/legal/, rendered verbatim so the page and
// the repository can never disagree about which text a parent was shown.
function loadNotice(): string {
  try {
    return readFileSync(
      join(process.cwd(), "docs/legal/PRIVACY-NOTICE-ru.md"),
      "utf8"
    );
  } catch {
    return "Текст уведомления временно недоступен. Напишите оператору — контакт ниже.";
  }
}

export default function PrivacyPage() {
  const md = loadNotice();
  return (
    <main className="min-h-screen bg-[var(--color-bg-base)] px-6 py-10 text-[var(--text-primary)]">
      <div className="mx-auto max-w-3xl space-y-6">
        <p
          data-testid="legal-status"
          className="rounded-xl border border-[var(--border-color)] bg-[var(--surface-strong)] px-4 py-3 text-sm text-[var(--text-secondary)]"
        >
          Редакция 1.0 от 28.09.2026. Подготовлена оператором на основании законодательства
          Азербайджанской Республики (раздел «Какие законы применяются»). Внешним юристом не
          заверялась.
        </p>
        <h1 className="text-3xl font-semibold">Уведомление о конфиденциальности</h1>
        <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[var(--text-secondary)]">{md}</pre>
        <OperatorContactLine />

        {/* This block credits the third-party assets we actually ship: fonts and icons.
            The companion's four animated faces (public/lottie/) are first-party — hand
            authored as Lottie shape JSON by scripts/build-monster-faces.mjs, no
            third-party artwork, so no licence notice attaches to them. Provenance for
            every shipped asset: docs/legal/ASSET-PROVENANCE.md. */}
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
            Шрифты Comfortaa, Nunito и Geist Mono — SIL Open Font License 1.1. Иконки
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
