"use client";

import React from "react";
import { useGameStore } from "@/stores/game";

export const SkinSelector = () => {
  const activeSkin = useGameStore((state) => state.activeSkin);
  const setActiveSkin = useGameStore((state) => state.setActiveSkin);
  const setMessages = useGameStore((state) => state.setMessages);

  const handleSkinChange = (emoji: string, name: string, color: string) => {
    setActiveSkin(emoji, name, color);
    setMessages(prev => [
      ...prev,
      {
        id: Math.random().toString(),
        sender: "monster",
        avatar: emoji,
        text: `Характер изменен на ${name}! Давай пообщаемся?`,
      }
    ]);
  };

  // These four were #8b5cf6 / #06b6d4 / #ec4899 / #10b981 — violet, cyan, pink and emerald
  // straight out of Tailwind's default palette, left over from the retired dark theme. They
  // are child-facing choices, so they now come from the product's own colours, and each lands
  // where its creature already pointed: fire on primary, robot on secondary, star on accent,
  // slime on success.
  const skins = [
    { emoji: "🐲", name: "Огненный Дракончик", color: "var(--color-primary)" },
    { emoji: "🤖", name: "Робо-Кот Марк-1", color: "var(--color-secondary)" },
    { emoji: "🦄", name: "Звездный Пони", color: "var(--color-accent)" },
    { emoji: "👾", name: "Космический Слизень", color: "var(--color-success)" }
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">Выбрать Облик</span>
      <div className="grid grid-cols-4 gap-2">
        {skins.map((skin) => (
          <button
            key={skin.emoji}
            onClick={() => handleSkinChange(skin.emoji, skin.name, skin.color)}
            aria-label={skin.name}
            aria-pressed={activeSkin === skin.emoji}
            className={`aspect-square rounded-xl border text-xl flex items-center justify-center transition-[colors,box-shadow] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-secondary-dark)] ${
              activeSkin === skin.emoji
                ? "border-[var(--color-secondary)] bg-[var(--color-secondary-soft)]"
                : "border-[var(--border-color)] bg-[var(--surface-strong)] hover:bg-[var(--surface-strong)]"
            }`}
          >
            {skin.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
