import { Resend } from "resend";

/**
 * Family invitation — the one letter a parent gets when the operator opens access.
 *
 * It carries two credentials that exist nowhere else: the parent's one-time activation link and
 * the child's code. Plain-string HTML (like consent-email.ts) rather than React, so a plain
 * `node scripts/...` run can render and send it without a build step, and so the markup stays
 * inline-styled — the only thing mail clients reliably render.
 *
 * Nothing about the child is asked for or included: the letter is addressed to the adult.
 */

const FROM_FALLBACK = "MindShift Academy <onboarding@resend.dev>";
const APP_URL_FALLBACK = "https://academy.volaura.app";

export type FamilyInvite = {
  /** Parent email — the address that was allowlisted. */
  to: string;
  /** Raw activation token (never logged, never stored). */
  activationToken: string;
  /** Raw 8-char child code. */
  code: string;
  parentName?: string | null;
  appUrl?: string;
};

export const INVITE_SUBJECT = "MindShift: доступ для вашего ребёнка открыт";

/** "ABCD2345" -> "ABCD 2345" — read aloud and typed by an 8-year-old. */
export function formatCode(code: string): string {
  return `${code.slice(0, 4)} ${code.slice(4)}`;
}

export function inviteText(invite: FamilyInvite): string {
  const appUrl = invite.appUrl ?? APP_URL_FALLBACK;
  return [
    invite.parentName ? `Здравствуйте, ${invite.parentName}!` : "Здравствуйте!",
    "",
    "Мы открыли вашей семье доступ к закрытому тесту MindShift Academy. Это бесплатный курс мышления для детей 8-11 лет: ребёнок учит своего монстра точным командам и сам видит, что получается.",
    "",
    "Шаг 1 — вы, один раз, одна минута:",
    `${appUrl}/activate?t=${invite.activationToken}`,
    "На этой странице нужно отметить два согласия. Ссылка личная, никому не передавайте.",
    "",
    "Шаг 2 — ребёнок:",
    `${appUrl}/enter-code`,
    `Код: ${formatCode(invite.code)}`,
    "",
    "Шаг 3 — дальше ребёнок идёт сам. 15 занятий по 15-20 минут, в конце сертификат и его монстр остаётся с ним.",
    "",
    `Подробная инструкция: ${appUrl}/start`,
    "",
    "О данных: свободный текст ребёнка мы не храним. Что собираем и как удалить — на страницах:",
    `${appUrl}/privacy`,
    `${appUrl}/parent-rights`,
    "",
    "Если что-то не открылось — просто ответьте на это письмо.",
  ].join("\n");
}

export function inviteHtml(invite: FamilyInvite): string {
  const appUrl = invite.appUrl ?? APP_URL_FALLBACK;
  const greeting = invite.parentName ? `Здравствуйте, ${invite.parentName}!` : "Здравствуйте!";
  const activateUrl = `${appUrl}/activate?t=${invite.activationToken}`;

  return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:24px 0;background:#070b14;font-family:-apple-system,'Segoe UI',Roboto,sans-serif;color:#e8eefc">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#0e1422;border-radius:16px">
    <tr><td style="padding:28px 28px 8px">
      <p style="margin:0 0 6px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#e9c400">Закрытый тест</p>
      <h1 style="margin:0;font-size:23px;line-height:1.25;color:#fff">Доступ для вашего ребёнка открыт</h1>
    </td></tr>

    <tr><td style="padding:12px 28px 0">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#d7def0">${greeting}</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#d7def0">
        MindShift Academy — бесплатный курс мышления для детей 8-11 лет. Ребёнок учит своего монстра
        точным командам: 15 занятий по 15-20 минут, всё на русском, взрослый рядом не нужен.
      </p>
    </td></tr>

    <tr><td style="padding:20px 28px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141b2e;border-radius:14px">
        <tr><td style="padding:18px">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#c4b5fd">Шаг 1 — вы, одна минута</p>
          <p style="margin:0 0 14px;font-size:14px;line-height:1.55;color:#d7def0">
            Откройте личную ссылку и отметьте два согласия. Ссылка одноразовая — не пересылайте её.
          </p>
          <a href="${activateUrl}" style="display:inline-block;padding:13px 22px;border-radius:12px;background:#8b5cf6;color:#fff;font-size:15px;font-weight:600;text-decoration:none">Открыть доступ</a>
          <p style="margin:12px 0 0;font-size:12px;line-height:1.5;color:#9aa6c2;word-break:break-all">Если кнопка не работает: ${activateUrl}</p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:14px 28px 0">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#141b2e;border-radius:14px">
        <tr><td style="padding:18px;text-align:center">
          <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#c4b5fd;text-align:left">Шаг 2 — ребёнок</p>
          <p style="margin:0 0 12px;font-size:14px;line-height:1.55;color:#d7def0;text-align:left">
            На странице <a href="${appUrl}/enter-code" style="color:#c4b5fd">${appUrl}/enter-code</a> ребёнок вводит свой код:
          </p>
          <p style="margin:0;font-size:30px;letter-spacing:7px;font-weight:700;color:#fff">${formatCode(invite.code)}</p>
        </td></tr>
      </table>
    </td></tr>

    <tr><td style="padding:14px 28px 0">
      <p style="margin:0;font-size:14px;line-height:1.6;color:#d7def0">
        <strong style="color:#fff">Шаг 3</strong> — дальше ребёнок идёт сам. В конце он получает сертификат,
        а его монстр остаётся с ним.
      </p>
    </td></tr>

    <tr><td style="padding:20px 28px 0">
      <p style="margin:0 0 6px;font-size:13px;line-height:1.6;color:#9aa6c2">
        О данных: свободный текст ребёнка мы не храним. Что именно собираем и как удалить всё в один клик —
        <a href="${appUrl}/privacy" style="color:#c4b5fd">конфиденциальность</a> и
        <a href="${appUrl}/parent-rights" style="color:#c4b5fd">права родителя</a>.
      </p>
      <p style="margin:0;font-size:13px;line-height:1.6;color:#9aa6c2">
        Пошаговая инструкция: <a href="${appUrl}/start" style="color:#c4b5fd">${appUrl}/start</a>.
        Что-то не открылось — просто ответьте на это письмо.
      </p>
    </td></tr>

    <tr><td style="padding:22px 28px 26px">
      <p style="margin:0;font-size:12px;color:#6f7c9c">MindShift Academy · закрытый тест · участие бесплатное</p>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Send one invitation. Returns { sent:false } instead of throwing when Resend is unconfigured,
 * so a dry run stays possible on any machine. The token and the code are never logged.
 */
export async function sendFamilyInvite(
  invite: FamilyInvite
): Promise<{ sent: boolean; reason?: string; id?: string }> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return { sent: false, reason: "no_api_key" };

  try {
    const resend = new Resend(resendKey);
    const result = await resend.emails.send({
      from: process.env.RESEND_FROM?.trim() || FROM_FALLBACK,
      to: invite.to,
      subject: INVITE_SUBJECT,
      text: inviteText(invite),
      html: inviteHtml(invite),
    });
    if (result.error) {
      console.error("[family-invite] send rejected:", result.error.name ?? "error");
      return { sent: false, reason: "send_error" };
    }
    return { sent: true, id: result.data?.id };
  } catch (err) {
    console.error("[family-invite] send failed:", (err as { name?: string })?.name ?? "Error");
    return { sent: false, reason: "send_error" };
  }
}
