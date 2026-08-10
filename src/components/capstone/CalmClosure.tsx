"use client";

import React from "react";
import Link from "next/link";
import { MonsterAvatar } from "@/components/companion/MonsterAvatar";

type Props = {
  monsterName?: string;
  certificateReady?: boolean;
};

/**
 * Capstone calm closure — no upsell, no next-module pressure.
 * Child-facing line: «монстр остаётся с тобой».
 */
export function CalmClosure({ monsterName = "Монстр", certificateReady }: Props) {
  return (
    <section
      data-testid="capstone-calm-closure"
      className="max-w-2xl mx-auto px-6 py-12 space-y-8 text-center"
    >
      <MonsterAvatar mood="celebrating" size={140} className="mx-auto" />
      <h1 className="text-3xl font-bold text-[var(--ink)]">Путь пройден</h1>
      <p className="text-lg text-[var(--color-primary-dark)]">
        {monsterName} остаётся с тобой.
      </p>
      <p className="text-sm text-[var(--text-secondary)]">
        Выпускная аура зажглась. Можно сохранить карточку-талисман и открыть сертификат.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {certificateReady ? (
          <Link
            href="/certificate"
            className="min-h-11 px-6 py-3 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary)] font-semibold text-white"
            data-testid="open-certificate"
          >
            Открыть сертификат
          </Link>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">
            Сертификат появится, когда все условия будут выполнены.
          </p>
        )}
        <Link
          href="/dashboard"
          className="min-h-11 px-6 py-3 rounded-full border border-[var(--border-color)] hover:bg-[var(--surface-strong)] font-semibold text-[var(--ink)]"
        >
          В кабинет
        </Link>
      </div>
    </section>
  );
}
