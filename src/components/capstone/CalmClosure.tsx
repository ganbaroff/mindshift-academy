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
      <h1 className="text-3xl font-bold text-white">Путь пройден</h1>
      <p className="text-lg text-violet-100">
        {monsterName} остаётся с тобой.
      </p>
      <p className="text-sm text-white/70">
        Выпускная аура зажглась. Можно сохранить карточку-талисман и открыть сертификат.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {certificateReady ? (
          <Link
            href="/certificate"
            className="min-h-11 px-6 py-3 rounded-full bg-violet-600 hover:bg-violet-500 font-semibold text-white"
            data-testid="open-certificate"
          >
            Открыть сертификат
          </Link>
        ) : (
          <p className="text-sm text-white/60">
            Сертификат появится, когда все условия будут выполнены.
          </p>
        )}
        <Link
          href="/dashboard"
          className="min-h-11 px-6 py-3 rounded-full border border-white/15 hover:bg-white/5 font-semibold text-white"
        >
          В кабинет
        </Link>
      </div>
    </section>
  );
}
