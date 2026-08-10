import { Resend } from "resend";
import { sendTelegramAlert, telegramAlertConfigured } from "@/lib/notify-telegram";

/**
 * One operator alert, two possible roads.
 *
 * Telegram is the preferred channel, but it needs a chat id that only a human can supply (the
 * Bot API gives a bot no way to list the chats it belongs to). Until that id exists the alert
 * falls back to email, so a new pilot request is never silently invisible.
 *
 * Never throws: an alert must not be able to fail the request that triggered it.
 */

export type AlertChannel = "telegram" | "email" | "none";

export async function notifyOperator(
  text: string,
  subject = "MindShift: новая заявка на доступ"
): Promise<AlertChannel> {
  if (telegramAlertConfigured()) {
    const sent = await sendTelegramAlert(text);
    if (sent) return "telegram";
  }

  const key = process.env.RESEND_API_KEY;
  const to = process.env.OPERATOR_ALERT_EMAIL?.trim();
  const from = process.env.RESEND_FROM?.trim();
  if (!key || !to || !from) return "none";

  try {
    const resend = new Resend(key);
    const result = await resend.emails.send({ from, to, subject, text });
    return result.error ? "none" : "email";
  } catch (error) {
    console.error("[notify-operator] email failed:", (error as { name?: string })?.name ?? "Error");
    return "none";
  }
}
