import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import { ClerkProvider } from "@clerk/nextjs";
import { ruRU } from "@clerk/localizations";
import { ClerkRussianUi } from "@/components/auth/ClerkRussianUi";
import { MotionProvider } from "@/components/providers/MotionProvider";

export const metadata: Metadata = {
  title: {
    default: "MindShift Academy — Обучение ИИ через игру",
    template: "%s | MindShift",
  },
  description: 'Научись управлять искусственным интеллектом через промпт-инженерию. Образовательная платформа для детей 8-14 лет.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'dark',
  themeColor: '#070b14',
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
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <ClerkRussianUi />
          <MotionProvider>{children}</MotionProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
