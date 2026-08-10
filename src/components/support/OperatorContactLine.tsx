import { getOperatorContact } from "@/lib/operator-contact";

/**
 * Visible operator contact on consent / dashboard (no placeholder emails).
 */
export function OperatorContactLine({ className = "" }: { className?: string }) {
  const { name, email, phone } = getOperatorContact();
  const telHref = `tel:${phone.replace(/[^\d+]/g, "")}`;

  return (
    <p
      data-testid="operator-contact"
      className={`text-sm leading-6 text-[var(--text-secondary)] ${className}`.trim()}
    >
      Связь с оператором: {name}
      {" · "}
      <a
        href={`mailto:${email}`}
        className="font-medium text-[var(--color-secondary-dark)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {email}
      </a>
      {" · "}
      <a
        href={telHref}
        className="font-medium text-[var(--color-secondary-dark)] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {phone}
      </a>
      . Документы:{" "}
      <a href="/privacy" className="underline-offset-2 hover:underline">
        конфиденциальность
      </a>
      {" · "}
      <a href="/parent-rights" className="underline-offset-2 hover:underline">
        права родителя
      </a>
      .
    </p>
  );
}
