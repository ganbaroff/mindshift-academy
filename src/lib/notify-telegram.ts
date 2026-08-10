/**
 * Best-effort operator alert to a Telegram chat/channel.
 *
 * Rules:
 *  - Optional: with TELEGRAM_BOT_TOKEN / TELEGRAM_ALERT_CHAT_ID unset this is a silent no-op,
 *    so no environment ever fails because notifications are not wired.
 *  - Never throws — an alert must not be able to fail a parent's submission.
 *  - Never logs the token or the URL (the token lives in the Bot API path).
 */

const API_TIMEOUT_MS = 4000;

export function telegramAlertConfigured(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return Boolean(env.TELEGRAM_BOT_TOKEN?.trim() && env.TELEGRAM_ALERT_CHAT_ID?.trim());
}

export async function sendTelegramAlert(
  text: string,
  env: NodeJS.ProcessEnv = process.env
): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = env.TELEGRAM_ALERT_CHAT_ID?.trim();
  if (!token || !chatId) return false;

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    if (!response.ok) {
      // Status only — the response body can echo the request context.
      console.error("[notify-telegram] sendMessage status:", response.status);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[notify-telegram] failed:", (error as { name?: string })?.name ?? "Error");
    return false;
  }
}
