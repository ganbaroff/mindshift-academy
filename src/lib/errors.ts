/**
 * Child/parent-facing API error catalog (P0-17).
 * Calm no-shame copy — never "Внутренняя ошибка." / English for user responses.
 */

export const CALM_RETRY =
  "Что-то пошло не так. Попробуй ещё раз!" as const;

export const Errors = {
  unauthorized: "Требуется вход в аккаунт.",
  forbidden: "Нет доступа.",
  consentRequired: "Нужно согласие родителя.",
  badRequest: "Неверный запрос.",
  notFound: "Не найдено.",
  rateLimited: "Слишком много запросов, подожди немного.",
  unavailable: "Сервис временно недоступен.",
  bypassUnavailable: "Тестовый обход недоступен.",
  calmRetry: CALM_RETRY,
  taskNotFound: "Задание не найдено.",
  sessionNotFound: "Сессия не найдена.",
  labelRejected: "Подпись не подходит.",
  notEligible: "Сертификат ещё не доступен.",
  safetyRewrite: "Давай сформулируем иначе.",
} as const;

export type ErrorKey = keyof typeof Errors;

export function apiError(
  key: ErrorKey,
  status: number,
  extra?: Record<string, unknown>
): { body: Record<string, unknown>; status: number } {
  return {
    status,
    body: { error: Errors[key], ...extra },
  };
}
