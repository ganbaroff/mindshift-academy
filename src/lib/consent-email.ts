import { Resend } from "resend";

// Parental-consent verification email (docs/COPPA-CONSENT-SPEC.md §8 RU / §9 AZ).
// The copy is frozen verbatim from the spec. If RESEND_API_KEY is absent the send is a no-op
// that reports `sent:false` — the gate + record logic stay fully testable without a real email.

export type ConsentLocale = "ru" | "az";

const FROM = "MindShift Academy <noreply@mindshift.academy>";

function subjectFor(locale: ConsentLocale): string {
  return locale === "az"
    ? "MindShift — valideyn təsdiq kodu"
    : "MindShift — код подтверждения родителя";
}

function bodyText(locale: ConsentLocale, code: string): string {
  if (locale === "az") {
    return [
      "Salam! Kimsə MindShift Academy-də uşaq girişi üçün sizin e-poçtunuzu valideyn kimi göstərib.",
      `Kodunuz: ${code} — 15 dəqiqə etibarlıdır.`,
      "Bu siz deyilsinizsə, məktubu nəzərə almayın — giriş açılmayacaq.",
    ].join("\n");
  }
  return [
    "Здравствуйте! Кто-то указал ваш email как родителя для доступа ребёнка в MindShift Academy.",
    `Ваш код: ${code} — действует 15 минут.`,
    "Если это были не вы — просто игнорируйте это письмо, доступ не откроется.",
  ].join("\n");
}

function bodyHtml(locale: ConsentLocale, code: string): string {
  const lines = bodyText(locale, code)
    .split("\n")
    .map((line) =>
      // Bold just the code token so it reads at a glance; everything else stays plain.
      line.replace(
        code,
        `<strong style="font-size:22px;letter-spacing:3px">${code}</strong>`
      )
    )
    .map((line) => `<p style="margin:0 0 12px">${line}</p>`)
    .join("");
  return `<div style="font-family:sans-serif;line-height:1.5;color:#11182a">${lines}</div>`;
}

/**
 * Send the 6-digit consent code. Returns { sent } — false (not an error) when RESEND_API_KEY
 * is unset, so the CEO can set the key later without changing code. The raw code is passed in
 * from the caller and is NOT logged.
 */
export async function sendConsentCode(params: {
  to: string;
  code: string;
  locale: ConsentLocale;
}): Promise<{ sent: boolean; reason?: string }> {
  const { to, code, locale } = params;
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    // Wired correctly, but no key => cannot actually deliver. The gate/record flow is still
    // testable: a dev/test caller can read the code from the createVerificationCode return.
    console.warn("[consent-email] RESEND_API_KEY not set — code email NOT sent (no-op).");
    return { sent: false, reason: "no_api_key" };
  }
  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: FROM,
      to,
      subject: subjectFor(locale),
      text: bodyText(locale, code),
      html: bodyHtml(locale, code),
    });
    return { sent: true };
  } catch (err) {
    console.error(
      "[consent-email] send failed:",
      (err as { name?: string })?.name ?? "Error"
    );
    return { sent: false, reason: "send_error" };
  }
}
