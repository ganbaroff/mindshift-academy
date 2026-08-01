/**
 * Visible operator contact line for pilot support (readiness contradiction 9 / W5).
 * Email/Telegram from NEXT_PUBLIC_OPERATOR_CONTACT — never invent secrets.
 */
export function OperatorContactLine({ className = "" }: { className?: string }) {
  const contact =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_OPERATOR_CONTACT?.trim()) ||
    "pilot-ops@volaura.app";
  const isEmail = contact.includes("@") && !contact.startsWith("http");
  const href = isEmail ? `mailto:${contact}` : contact.startsWith("http") ? contact : `mailto:${contact}`;

  return (
    <p
      data-testid="operator-contact"
      className={`text-sm leading-6 text-white/70 ${className}`.trim()}
    >
      Связь с оператором пилота:{" "}
      <a
        href={href}
        className="font-medium text-primary-soft underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {contact}
      </a>
      . Черновик юридического пакета:{" "}
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
