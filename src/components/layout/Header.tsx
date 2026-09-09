"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useGameStore } from "@/stores/game";
import { classifySurface } from "@/lib/problem-report";

export const Header = () => {
  const crystals = useGameStore((state) => state.crystals);
  /**
   * Two names, one product. A child is here to meet a creature, so the bar says
   * «Зверёныш»; a parent is here to run a school, so it says MindShift Academy. Legal
   * copy, e-mail and the consent flow keep the company name regardless — this is the
   * child's word for the thing, not a rebrand of the entity.
   *
   * The child/parent split reuses `classifySurface`, so there is exactly one list of
   * child routes in the codebase and the header can never disagree with the feedback
   * button about where the child is.
   */
  const isChild = classifySurface(usePathname() ?? "/") === "child";

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-3 border-b border-[var(--border-color)] bg-[var(--color-bg-base)]/80 px-4 py-2.5 backdrop-blur-xl sm:px-8 sm:py-4">
      {/* On a child screen the wordmark is the way back to the map. The map was shipped
          reachable only by typing its URL, which for an eight-year-old means not at all. */}
      <a
        href={isChild ? "/map" : "/"}
        aria-label={isChild ? "К карте" : "На главную"}
        className="flex min-w-0 items-center gap-2 rounded-2xl transition-transform duration-[160ms] [transition-timing-function:var(--ease-out)] active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] sm:gap-3"
      >
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-lg font-extrabold text-[var(--ink)] sm:h-10 sm:w-10 sm:text-xl">
          {isChild ? "З" : "M"}
        </div>
        {/* Was a white→violet gradient clipped to the text, which on cream paper rendered
            as nothing at all. Solid ink, and the display face. */}
        <span className="font-display max-w-[140px] truncate text-sm font-bold tracking-tight text-[var(--ink)] sm:max-w-none sm:text-xl">
          {isChild ? "Зверёныш" : "MindShift Academy"}
        </span>
      </a>

      {/* Three things used to live here and all three lied to the child.
          «Серия» was a flame and the word, with no number behind it — a promise of a
          streak mechanic the canon (§6) forbids and the product does not have.
          «Уровень 2» was a hardcoded string: every child, every session, level two.
          «{totalXp} / 1000 XP» invented its own denominator, and its bar was a
          violet→cyan neon gradient with a cyan glow — the palette of the dark theme
          globals.css itself calls a mistake («it read as an adult analytics dashboard,
          not as a companion for an eight-year-old»).
          Progress the child is allowed to see lives on the map and in «Задание N из M»,
          which are both real. Crystals stay: they buy hints, so they are the one number
          here that does something. */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-5">
        <div
          aria-label={`Кристаллы: ${crystals}`}
          className="flex items-center gap-2 rounded-full border border-[var(--color-accent-dark)] bg-[var(--surface-strong)] px-2 py-2 text-sm font-semibold text-[var(--ink)] sm:px-4"
        >
          <span aria-hidden="true">💎</span>
          <span className="tabular-nums" suppressHydrationWarning>
            {crystals}
          </span>
        </div>
      </div>
    </header>
  );
};
