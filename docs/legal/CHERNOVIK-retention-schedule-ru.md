# График хранения данных (MindShift Academy)

> **ЧЕРНОВИК — требует подтверждения юриста**  
> Дата черновика: 2026-07-31.

## Принцип «без хранения сырого текста ребёнка»
- `TaskAttempt`, `DegradeEvent`, `SessionCost`, `FormulationSubmission`, `ReportDeliveryLog`, сертификат — **не содержат** сырых реплик ребёнка.
- Формулировка «своими словами» хранит только метаданные (`submitted`, версия контента, day-bucket), не текст.
- События деградации: псевдонимный `opaqueSessionId`, day-bucket, enum причины; без Clerk ID, IP, точного timestamp, текста.

## Черновой график

| Класс данных | Где | Пока аккаунт активен | После отзыва / удаления |
|---|---|---|---|
| Согласие родителя | ParentalConsent / AccessCode consent flags | Да | Фиксируется отзыв; API ребёнка закрыты |
| Прогресс / mastery | TaskAttempt, ConceptMastery | Да | Удаление по запросу родителя (Academy erase) |
| Питомец / инвентарь | Monster, Inventory | Да | Удаление по запросу |
| Код доступа | AccessCode (только хеши) | До `expiresAt` | Не восстанавливаем сырой код |
| DegradeEvent | DegradeEvent | До `retentionUntil` | Истекает / чистится по политике |
| SessionCost | SessionCost | Пока нужен учёт пилота | Агрегаты без текста |
| Отчёты родителю | Resend delivery + ReportDeliveryLog | Лог доставки без детского текста | По запросу |
| Сертификат | Certificate | Пока не запрошено удаление | Удаление записи по erasure |

## Операционный запрет
Не добавлять в таблицы/логи: сырой детский ввод, промпты, ответы ИИ, device fingerprint, session replay.
