"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ShieldCheck, Mail, KeyRound, Loader2, CheckCircle2 } from "lucide-react";

// Parental consent screen (docs/COPPA-CONSENT-SPEC.md §3 flow, §8 RU / §9 AZ copy).
// Flow: enter parent email (defaults to Clerk email) -> request 6-digit code -> enter code +
// tick BOTH opt-ins -> submit. On success we route to /dashboard; the child gates unlock.
// Design system: dark surfaces, primary=violet, secondary=cyan, warning=gold. NO red — errors
// use the purple --color-error token.

type Locale = "ru" | "az";
type Step = "email" | "code";

// Copy frozen from spec §8 (RU) / §9 (AZ).
const COPY: Record<Locale, {
  title: string;
  intro: string;
  collect: string;
  processing: string;
  never: string;
  rights: string;
  optA: string;
  optB: string;
  emailLabel: string;
  emailHint: string;
  sendCode: string;
  codeLabel: string;
  codeHint: string;
  confirm: string;
  bothRequired: string;
  resend: string;
  changeEmail: string;
  emailSent: string;
  emailNoKey: string;
}> = {
  ru: {
    title: "Согласие родителя",
    intro:
      "MindShift Academy — обучающее приложение для детей. Прежде чем ваш ребёнок начнёт, нам нужно ваше согласие как родителя.",
    collect:
      "Что мы собираем: сообщения, которые ребёнок пишет питомцу; имя и вид питомца; прогресс по урокам.",
    processing:
      "Как обрабатываются сообщения: каждое сообщение проверяет автоматическая система безопасности и обрабатывает внешний ИИ-провайдер (NVIDIA, США), чтобы питомец мог ответить. Перед генерацией ответа из текста удаляются почты, телефоны и числа. Текст сообщений мы не храним.",
    never:
      "Чего мы не делаем: не продаём данные, не показываем рекламу, не используем данные ребёнка для маркетинга.",
    rights:
      "Ваши права: в любой момент посмотреть, удалить данные ребёнка и отозвать согласие — тогда чат отключится.",
    optA:
      "Я родитель/опекун и даю согласие на сбор и использование данных моего ребёнка для обучения в MindShift Academy.",
    optB:
      "Я согласен(на), что сообщения ребёнка обрабатываются автоматической системой безопасности и внешним ИИ-провайдером (NVIDIA, США) для работы тьютора.",
    emailLabel: "Email родителя",
    emailHint: "Мы отправим 6-значный код на этот адрес.",
    sendCode: "Отправить код",
    codeLabel: "Код из письма",
    codeHint: "Код действует 15 минут.",
    confirm: "Подтвердить",
    bothRequired: "Нужны обе галочки.",
    resend: "Отправить код повторно",
    changeEmail: "Изменить email",
    emailSent: "Код отправлен на",
    emailNoKey:
      "Отправка писем пока не настроена (нет ключа). Код сгенерирован — попросите администратора включить почту.",
  },
  az: {
    title: "Valideyn razılığı",
    intro:
      "MindShift Academy — uşaqlar üçün təhsil tətbiqidir. Övladınız başlamazdan əvvəl valideyn kimi razılığınız lazımdır.",
    collect:
      "Nə toplayırıq: uşağın köməkçiyə yazdığı mesajlar; köməkçinin adı və görünüşü; dərslər üzrə irəliləyiş.",
    processing:
      "Mesajlar necə işlənir: hər mesajı avtomatik təhlükəsizlik sistemi yoxlayır və xarici Süni İntellekt provayderi (NVIDIA, ABŞ) emal edir ki, köməkçi cavab verə bilsin. Cavab yaradılmazdan əvvəl mətndən e-poçt, telefon və rəqəmlər silinir. Mesajların mətnini saxlamırıq.",
    never:
      "Nə etmirik: məlumatları satmırıq, reklam göstərmirik, uşağın məlumatını marketinq üçün işlətmirik.",
    rights:
      "Hüquqlarınız: istənilən vaxt övladınızın məlumatlarına baxa, silə və razılığı geri götürə bilərsiniz — onda söhbət dayandırılır.",
    optA:
      "Mən valideyn/qəyyumam və övladımın məlumatlarının MindShift Academy-də təhsil üçün toplanmasına və istifadəsinə razılıq verirəm.",
    optB:
      "Uşağın mesajlarının avtomatik təhlükəsizlik sistemi və xarici SI provayderi (NVIDIA, ABŞ) tərəfindən işlənməsinə razıyam.",
    emailLabel: "Valideyn e-poçtu",
    emailHint: "Bu ünvana 6 rəqəmli kod göndərəcəyik.",
    sendCode: "Kod göndər",
    codeLabel: "Məktubdakı kod",
    codeHint: "Kod 15 dəqiqə etibarlıdır.",
    confirm: "Təsdiqlə",
    bothRequired: "Hər iki qutu lazımdır.",
    resend: "Kodu yenidən göndər",
    changeEmail: "E-poçtu dəyiş",
    emailSent: "Kod göndərildi:",
    emailNoKey:
      "E-poçt göndərişi hələ konfiqurasiya edilməyib (açar yoxdur). Kod yaradıldı — administratordan poçtu aktivləşdirməyi xahiş edin.",
  },
};

export default function ConsentPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [locale, setLocale] = useState<Locale>("ru");
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [optA, setOptA] = useState(false);
  const [optB, setOptB] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const t = COPY[locale];

  // Default the email field to the Clerk account email once loaded.
  useEffect(() => {
    if (isLoaded && user && !email) {
      // Default the email field to the loaded Clerk account email — syncing an external
      // (Clerk) value into a form field once on load, not a cascading render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmail(user.primaryEmailAddress?.emailAddress ?? "");
    }
  }, [isLoaded, user, email]);

  // If consent is already valid, skip straight to the dashboard.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/consent/status")
      .then((r) => r.json())
      .then((s) => {
        if (!cancelled && s?.valid) router.replace("/dashboard");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function requestCode() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const res = await fetch("/api/consent/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, locale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Ошибка");
        return;
      }
      setStep("code");
      setNotice(data.emailSent ? `${t.emailSent} ${data.parentEmail}` : t.emailNoKey);
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  async function submitConsent() {
    setError(null);
    if (!optA || !optB) {
      setError(t.bothRequired);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/consent/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, serviceConsent: optA, externalAiConsent: optB }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Код неверный.");
        return;
      }
      // Fresh consent just recorded → continue the child's first-run flow (hatch + name the
      // monster, then lesson 1). The onboarding/lesson gates now pass, so this no longer
      // dead-ends on the parent-only dashboard. (A parent REVISITING /consent while already
      // valid is still sent to /dashboard by the mount effect above.)
      router.replace("/onboarding");
    } catch {
      setError("Сеть недоступна. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(139,92,246,0.18),transparent_35%),radial-gradient(circle_at_80%_15%,rgba(34,211,238,0.14),transparent_30%)]" />

      <section className="relative z-10 w-full max-w-xl rounded-[28px] border border-white/10 bg-surface/90 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.28)] sm:p-8">
        <div className="mb-5 flex items-center justify-between gap-4">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/[0.04]">
            <ShieldCheck className="h-6 w-6 text-primary-soft" />
          </span>
          <div className="flex rounded-full border border-white/10 bg-white/[0.04] p-1 text-xs" role="group" aria-label="Язык / Dil">
            {(["ru", "az"] as Locale[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                aria-pressed={locale === l}
                className={`min-h-[36px] rounded-full px-3 font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  locale === l ? "bg-primary text-white" : "text-white/70 hover:text-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <h1 className="text-2xl font-semibold text-white">{t.title}</h1>
        <p className="mt-3 text-sm leading-6 text-white/72">{t.intro}</p>

        <div className="mt-5 space-y-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/70">
          <p>{t.collect}</p>
          <p>{t.processing}</p>
          <p>{t.never}</p>
          <p>{t.rights}</p>
        </div>

        {/* Error region — purple per design system, never red. */}
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-error/40 bg-error/10 px-4 py-3 text-sm font-medium text-error"
          >
            {error}
          </p>
        )}
        {notice && (
          <p className="mt-4 rounded-xl border border-secondary/30 bg-secondary/10 px-4 py-3 text-sm text-secondary">
            {notice}
          </p>
        )}

        {step === "email" && (
          <div className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                <Mail className="h-4 w-4 text-primary-soft" />
                {t.emailLabel}
              </span>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="parent@email.com"
                className="w-full rounded-xl border border-white/12 bg-surface-strong/80 px-4 py-3 text-base text-white placeholder-white/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <span className="mt-2 block text-xs text-white/50">{t.emailHint}</span>
            </label>
            <button
              type="button"
              disabled={busy || !email}
              onClick={requestCode}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <KeyRound className="h-4 w-4" />}
              {t.sendCode}
            </button>
          </div>
        )}

        {step === "code" && (
          <div className="mt-6 space-y-5">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-medium text-white/80">
                <KeyRound className="h-4 w-4 text-primary-soft" />
                {t.codeLabel}
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full rounded-xl border border-white/12 bg-surface-strong/80 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
              <span className="mt-2 block text-xs text-white/50">{t.codeHint}</span>
            </label>

            <fieldset className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/78 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/[0.08]">
                <input
                  type="checkbox"
                  checked={optA}
                  onChange={(e) => setOptA(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--color-primary)]"
                />
                <span>{t.optA}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4 text-sm leading-6 text-white/78 has-[:checked]:border-primary/50 has-[:checked]:bg-primary/[0.08]">
                <input
                  type="checkbox"
                  checked={optB}
                  onChange={(e) => setOptB(e.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-[color:var(--color-primary)]"
                />
                <span>{t.optB}</span>
              </label>
            </fieldset>

            <button
              type="button"
              disabled={busy || code.length !== 6 || !optA || !optB}
              onClick={submitConsent}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" /> : <CheckCircle2 className="h-4 w-4" />}
              {t.confirm}
            </button>

            <div className="flex flex-wrap justify-between gap-3 text-xs">
              <button
                type="button"
                onClick={() => { setStep("email"); setCode(""); setNotice(null); setError(null); }}
                className="min-h-[36px] text-white/60 underline-offset-2 hover:text-white hover:underline"
              >
                {t.changeEmail}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={requestCode}
                className="min-h-[36px] text-primary-soft underline-offset-2 hover:underline disabled:opacity-50"
              >
                {t.resend}
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
