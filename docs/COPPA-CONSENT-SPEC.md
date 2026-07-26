# COPPA Parental Consent — Spec + Copy (CLOSED TEST)

**Author:** Cowork-Atlas · **Date:** 2026-06-28 · **For:** Code-Atlas (build) + CEO (review)
**Legal basis researched live** against the FTC 2025 COPPA amendments — see Sources. This is **not** a lawyer sign-off; it is the defensible engineering minimum for an invite-only test. Public launch has a separate, stricter gate (§10).

---

## 1. Scope decision (FINAL for the closed test)

Build an **email-verified parental consent gate with an explicit, separate consent to external-AI processing.** No payment, no full VPC for the closed invite test.

Why not bare "email-plus": under COPPA, the **email-plus method is valid only when the operator does NOT disclose the child's data to third parties** (internal use only). MindShift sends the child's messages to **NVIDIA (US LLM)** to generate the monster's reply and to run safety moderation — a third-party data flow. So email-plus *alone* is not sufficient. The honest fix for the closed test is to **disclose that external processing plainly and get the parent's explicit, separate opt-in to it**, on top of email verification of the parent.

This is enough to ethically run a closed test with the CEO's own/approved family accounts. It is **not** enough for public launch (§10).

---

## 2. Legal grounding (why this exact shape)

- **Email-plus = internal use only.** If a child's PII is disclosed to a third party, email-plus is not adequate; a separate consent for that disclosure is required unless the disclosure is "integral" to the service. (FTC FAQ; 2025 amendments.)
- **The NVIDIA flow is the third-party question.** Two honest ways to make it compliant: (a) a **DPA** that binds NVIDIA as a service-provider processing *on our behalf* (no own use) — which can make it "support for internal operations / integral", or (b) **explicit separate parental consent** to the external-AI processing. The closed test uses (b) + plain disclosure; public adds (a).
- **2025 VPC methods** (for when we go public): knowledge-based authentication, **text-plus** (text + confirmation), credit-card/online-payment with transaction notice, government-ID-to-selfie match. Email-plus/text-plus are explicitly **not** adequate to consent to third-party disclosure for advertising.
- We do **no ads, no sale, no marketing profiling** — that keeps us out of the worst category and makes the integral/internal-ops argument cleaner.

---

## 3. Consent flow (build this)

1. **Gate trigger.** After sign-up, before the child can reach `/api/chat` (or any lesson chat), route to `/consent` unless a valid `ParentalConsent` row exists for the account.
2. **Parent email.** Parent enters their email (default to the Clerk account email; allow change).
3. **Verify (email-plus).** Send a 6-digit code via **Resend** (already in stack) to that email. Code valid 15 min, single use, hashed at rest.
4. **Disclosures + two explicit opt-ins** (both required, unchecked by default — §6):
   - (A) consent to collect/use the child's data for the tutoring service;
   - (B) **separate** consent to external-AI + safety processing (the NVIDIA flow).
5. **Record + unlock.** On submit, write `ParentalConsent`; unlock child access.
6. **Enforce.** `/api/chat`, lesson chat, and any child-data write **refuse with 403** when no valid, non-revoked consent exists.

---

## 4. Data schema (Prisma — `prisma db push`)

```prisma
model ParentalConsent {
  id              String    @id @default(cuid())
  clerkId         String    @unique          // the account this consent covers
  parentEmail     String
  method          String    @default("email-plus")
  serviceConsent  Boolean   @default(false)  // opt-in (A)
  externalAiConsent Boolean @default(false)  // opt-in (B) — the NVIDIA disclosure
  consentVersion  String                     // e.g. "2026-06-28" — re-prompt if policy changes
  ipAddress       String?
  verifiedAt      DateTime?
  revokedAt       DateTime?
  createdAt       DateTime  @default(now())
}
// Verification codes live in a short-TTL table or signed token — NEVER store the raw code; hash + 15-min expiry.
```

Valid consent = row exists, `verifiedAt != null`, `serviceConsent && externalAiConsent`, `revokedAt == null`, `consentVersion` current.

---

## 5. The gate

```ts
// helper: hasValidConsent(clerkId): boolean
// In /api/chat (and lesson chat, monster create, tts) BEFORE auth-gated work:
if (!(await hasValidConsent(clerkId))) {
  return Response.json(
    { code: "CONSENT_REQUIRED", message: "Parental consent required." },
    { status: 403 }
  );
}
```

Fail-closed: any error resolving consent → treat as NOT consented (block).

---

## 6. Disclosures the consent screen MUST state (plain, shame-free)

- **What we collect:** the child's typed messages, the pet's name/look, lesson progress.
- **How messages are processed:** each message is checked by an automated safety system **and** processed by an **external AI provider (NVIDIA, USA)** so the pet can reply. Emails/phones/long numbers are stripped from the text used to generate the reply; the safety check sees the full message.
- **Retention:** message text is **not** stored; we keep progress and the (already-redacted) pet prompt. The consent record is kept until revoked.
- **What we never do:** no selling data, no ads, no marketing profiling.
- **Parental rights:** review, delete the child's data, and revoke consent at any time (revoking disables the chat). A contact for privacy requests.

---

## 7. Parental rights (build a minimal surface)

- A "manage / revoke consent" action in the parent dashboard that sets `revokedAt` (immediately blocks chat).
- An authenticated parent can permanently delete Academy-held child data from the dashboard. This removes gameplay data plus consent and verification records; the parent Clerk account itself is retained. For a closed test, support may additionally handle requests received by email.

---

## 8. Copy — RU (consent screen + email)

**Screen — заголовок:** Согласие родителя

> MindShift Academy — обучающее приложение для детей. Прежде чем ваш ребёнок начнёт, нам нужно ваше согласие как родителя.
>
> **Что мы собираем:** сообщения, которые ребёнок пишет питомцу; имя и вид питомца; прогресс по урокам.
>
> **Как обрабатываются сообщения:** каждое сообщение проверяет автоматическая система безопасности и обрабатывает внешний ИИ-провайдер (NVIDIA, США), чтобы питомец мог ответить. Перед генерацией ответа из текста удаляются почты, телефоны и числа. Текст сообщений мы не храним.
>
> **Чего мы не делаем:** не продаём данные, не показываем рекламу, не используем данные ребёнка для маркетинга.
>
> **Ваши права:** в любой момент посмотреть, удалить данные ребёнка и отозвать согласие — тогда чат отключится.
>
> ☐ Я родитель/опекун и даю согласие на сбор и использование данных моего ребёнка для обучения в MindShift Academy.
> ☐ Я согласен(на), что сообщения ребёнка обрабатываются автоматической системой безопасности и внешним ИИ-провайдером (NVIDIA, США) для работы тьютора.
>
> **[ Подтвердить ]**  (нужны обе галочки)

**Email — тема:** MindShift — код подтверждения родителя

> Здравствуйте! Кто-то указал ваш email как родителя для доступа ребёнка в MindShift Academy.
> Ваш код: **{CODE}** — действует 15 минут.
> Если это были не вы — просто игнорируйте это письмо, доступ не откроется.

---

## 9. Copy — AZ (consent screen + email) — text runs ~25% longer, layout must flex

**Screen — başlıq:** Valideyn razılığı

> MindShift Academy — uşaqlar üçün təhsil tətbiqidir. Övladınız başlamazdan əvvəl valideyn kimi razılığınız lazımdır.
>
> **Nə toplayırıq:** uşağın köməkçiyə yazdığı mesajlar; köməkçinin adı və görünüşü; dərslər üzrə irəliləyiş.
>
> **Mesajlar necə işlənir:** hər mesajı avtomatik təhlükəsizlik sistemi yoxlayır və xarici Süni İntellekt provayderi (NVIDIA, ABŞ) emal edir ki, köməkçi cavab verə bilsin. Cavab yaradılmazdan əvvəl mətndən e-poçt, telefon və rəqəmlər silinir. Mesajların mətnini saxlamırıq.
>
> **Nə etmirik:** məlumatları satmırıq, reklam göstərmirik, uşağın məlumatını marketinq üçün işlətmirik.
>
> **Hüquqlarınız:** istənilən vaxt övladınızın məlumatlarına baxa, silə və razılığı geri götürə bilərsiniz — onda söhbət dayandırılır.
>
> ☐ Mən valideyn/qəyyumam və övladımın məlumatlarının MindShift Academy-də təhsil üçün toplanmasına və istifadəsinə razılıq verirəm.
> ☐ Uşağın mesajlarının avtomatik təhlükəsizlik sistemi və xarici SI provayderi (NVIDIA, ABŞ) tərəfindən işlənməsinə razıyam.
>
> **[ Təsdiqlə ]**  (hər iki qutu lazımdır)

**Email — mövzu:** MindShift — valideyn təsdiq kodu

> Salam! Kimsə MindShift Academy-də uşaq girişi üçün sizin e-poçtunuzu valideyn kimi göstərib.
> Kodunuz: **{CODE}** — 15 dəqiqə etibarlıdır.
> Bu siz deyilsinizsə, məktubu nəzərə almayın — giriş açılmayacaq.

---

## 10. NOT covered — the PRE-PUBLIC gate (CEO / legal, not this spec)

Before any non-family child / public launch, all of these are required and are **not** in this build:
1. **A stronger VPC method** than email-plus — text-plus-with-confirmation, knowledge-based auth, credit-card, or gov-ID-to-selfie (2025 methods).
2. **A signed DPA with NVIDIA** binding them as a service provider (no own use of child data) — this is what makes the external processing "internal operations / integral" rather than third-party disclosure.
3. **A children's privacy policy page** (separate, plain-language, with the required COPPA disclosures + contact).
4. **A human lawyer sign-off.** Agents can build to a defensible bar; the final legal posture for the public is a human-lawyer call.

---

## Sources
- FTC — Verifiable Parental Consent and the COPPA Rule: https://www.ftc.gov/business-guidance/privacy-security/verifiable-parental-consent-childrens-online-privacy-rule
- FTC — Complying with COPPA: FAQ: https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions
- FTC — Finalizes Changes to Children's Privacy Rule (Jan 2025): https://www.ftc.gov/news-events/news/press-releases/2025/01/ftc-finalizes-changes-childrens-privacy-rule-limiting-companies-ability-monetize-kids-data
- White & Case — Unpacking the FTC's COPPA amendments: https://www.whitecase.com/insight-alert/unpacking-ftcs-coppa-amendments-what-you-need-know
- Securiti — FTC's 2025 COPPA Final Rule Amendments: https://securiti.ai/ftc-coppa-final-rule-amendments/
- eCFR — 16 CFR Part 312 (COPPA Rule): https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-312
