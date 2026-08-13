import type { Metadata, Viewport } from "next";
import { Comfortaa, Nunito, Geist_Mono } from "next/font/google";
import "./globals.css";

/**
 * The mockup's type pair, with one substitution the mockup could not have known about.
 *
 * `next/font` downloads these at BUILD time and serves them from our own origin — a
 * child's browser never contacts Google, which matters because this product promises no
 * third-party requests on child screens.
 *
 * The mockup specified Baloo 2 for display. **Baloo 2 has no Cyrillic subset**, so on a
 * Russian interface every heading would have silently fallen back to a system font — the
 * mockup was written in Russian but rendered with a Latin-only face. Comfortaa carries
 * Cyrillic and the same rounded, friendly character. `--font-baloo` keeps its name so the
 * mockup's own token vocabulary still reads true.
 */
const baloo = Comfortaa({
  variable: "--font-baloo",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ClerkProvider } from "@clerk/nextjs";
import { ruRU } from "@clerk/localizations";
import { ClerkRussianUi } from "@/components/auth/ClerkRussianUi";
import { MotionProvider } from "@/components/providers/MotionProvider";
import { ReportProblemButton } from "@/components/support/ReportProblemButton";

export const metadata: Metadata = {
  title: {
    default: "MindShift Academy — Обучение ИИ через игру",
    template: "%s | MindShift",
  },
  description: 'Научись управлять искусственным интеллектом через промпт-инженерию. Образовательная платформа для детей 8–11 лет.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light',
  themeColor: '#FBF1E0',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={{
        ...ruRU,
        formFieldInputPlaceholder__signUpPassword: "Придумайте пароль",
        // Clerk fills {{applicationName}} from the dashboard, where it is still the default
        // "My Application" — the first thing a parent read on the login screen was the name of
        // someone else's app. Name it here, where the product owns its own copy.
        signIn: {
          ...ruRU.signIn,
          start: {
            ...ruRU.signIn?.start,
            title: "Вход для родителя",
            subtitle: "чтобы открыть кабинет MindShift Academy",
          },
        },
        signUp: {
          ...ruRU.signUp,
          start: {
            ...ruRU.signUp?.start,
            title: "Регистрация родителя",
            subtitle: "чтобы открыть доступ ребёнку в MindShift Academy",
          },
        },
      }}
    >
      <html
        lang="ru"
        className={`${baloo.variable} ${nunito.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ClerkRussianUi />
          <MotionProvider>{children}</MotionProvider>
          {/* On every page, for anyone with an account — the pilot's only feedback path.
              The component hides itself for signed-out visitors, who get the landing
              page's contact line instead: a report from nobody has no one to answer. */}
          <ReportProblemButton />
        </body>
      </html>
    </ClerkProvider>
  );
}
