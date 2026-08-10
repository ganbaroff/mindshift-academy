import Link from "next/link";
import { KeyRound, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { OperatorContactLine } from "@/components/support/OperatorContactLine";

// Printable family instruction sheet. Deliberately holds NO personal data and no credentials —
// the invitation email carries those. This page is the thing a parent can bookmark, print, or
// forward to the other parent without leaking a one-time link.

export const metadata = {
  title: "Как начать — MindShift Academy",
  description: "Три шага: родитель открывает доступ, ребёнок вводит код, дальше он идёт сам.",
};

const steps = [
  {
    icon: UserRound,
    tag: "Шаг 1 · родитель · одна минута",
    title: "Откройте личную ссылку из письма",
    body: "В письме есть кнопка «Открыть доступ». На странице нужно отметить два согласия: на участие ребёнка и на проверку сообщений внешними сервисами. Ссылка одноразовая и личная — не пересылайте её.",
  },
  {
    icon: KeyRound,
    tag: "Шаг 2 · ребёнок",
    title: "Введите код на странице входа",
    body: "Откройте academy.volaura.app/enter-code и введите код из письма — восемь знаков, большими буквами, без нуля и единицы, чтобы не путать. Пароль не нужен: код и есть вход.",
  },
  {
    icon: Sparkles,
    tag: "Шаг 3 · дальше сам",
    title: "Ребёнок проходит занятия один",
    body: "Пятнадцать занятий по 15-20 минут. Монстр понимает команды буквально, поэтому ребёнок учится говорить точно. Оценок нет, «неверных» ответов нет — есть «что сказал» и «что получилось».",
  },
] as const;

const answers = [
  {
    q: "Сколько это стоит?",
    a: "Ничего. Закрытый тест бесплатный, оплаты в продукте нет.",
  },
  {
    q: "Нужно ли сидеть рядом?",
    a: "Нет. Среда закрытая: свободного интернета внутри нет, каждое сообщение проходит проверку безопасности.",
  },
  {
    q: "Что если ребёнок бросил на середине?",
    a: "Прогресс сохраняется. По тому же коду он вернётся туда, где остановился — код работает до конца срока, а не один раз.",
  },
  {
    q: "Что сохраняется о ребёнке?",
    a: "Имя питомца, продвижение по навыкам и служебные записи. Свободный текст ребёнка не сохраняется. Удалить всё можно в кабинете родителя.",
  },
  {
    q: "Что в конце?",
    a: "Сертификат участника и карточка монстра, которого ребёнок вырастил.",
  },
] as const;

export default function StartGuidePage() {
  return (
    <main className="relative isolate min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(139,92,246,0.16),transparent_35%)] print:hidden" />

      <article className="relative z-10 mx-auto w-full max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.24em] text-warning">
          Закрытый тест · инструкция для семьи
        </p>
        <h1 className="mt-3 text-balance text-3xl font-semibold text-[var(--ink)] sm:text-4xl">
          Как начать за три шага
        </h1>
        <p className="mt-3 text-base leading-7 text-[var(--text-secondary)]">
          MindShift Academy — курс мышления для детей 8-11 лет. Ребёнок учит своего монстра точным
          командам и сам видит, что из этого выходит. Всё на русском, участие бесплатное.
        </p>

        <ol className="mt-9 space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <li
                key={step.title}
                className="rounded-[22px] border border-[var(--border-color)] bg-surface/90 p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)]"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/15 text-sm font-semibold text-[var(--color-secondary-dark)]">
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--ink)]/45">
                      {step.tag}
                    </p>
                    <h2 className="mt-1 flex items-center gap-2 text-lg font-semibold text-[var(--ink)]">
                      <Icon className="h-4 w-4 text-warning" aria-hidden="true" />
                      {step.title}
                    </h2>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">{step.body}</p>
              </li>
            );
          })}
        </ol>

        <section aria-labelledby="faq-title" className="mt-10">
          <h2 id="faq-title" className="text-xl font-semibold text-[var(--ink)]">
            Частые вопросы
          </h2>
          <dl className="mt-4 space-y-4">
            {answers.map((item) => (
              <div key={item.q} className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface-strong)] p-4">
                <dt className="text-sm font-semibold text-[var(--ink)]">{item.q}</dt>
                <dd className="mt-1.5 text-sm leading-6 text-[var(--text-secondary)]">{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10 rounded-2xl border border-primary/20 bg-primary/[0.08] p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <ShieldCheck className="h-4 w-4 text-[var(--color-secondary-dark)]" aria-hidden="true" />
            Если письма нет
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--ink)]/72">
            Проверьте папку «Спам». Если письма нет и там — оставьте{" "}
            <Link href="/request-access" className="font-medium text-[var(--color-secondary-dark)] underline-offset-4 hover:underline">
              заявку
            </Link>{" "}
            или напишите оператору: мы открываем доступ вручную, небольшими группами.
          </p>
          <div className="mt-3">
            <OperatorContactLine />
          </div>
        </section>

        <p className="mt-8 text-xs leading-5 text-[var(--ink)]/45">
          Эта страница не содержит вашего кода и вашей ссылки — их присылают только письмом.
          Страницу можно распечатать или сохранить.
        </p>
      </article>
    </main>
  );
}
