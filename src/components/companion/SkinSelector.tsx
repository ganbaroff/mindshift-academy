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

  const skins = [
    { emoji: "🐲", name: "Огненный Дракончик", color: "#8b5cf6" },
    { emoji: "🤖", name: "Робо-Кот Марк-1", color: "#06b6d4" },
    { emoji: "🦄", name: "Звездный Пони", color: "#ec4899" },
    { emoji: "👾", name: "Космический Слизень", color: "#10b981" }
  ];

  return (
    <div className="flex flex-col gap-2">
      <span className="text-gray-400 text-xs font-bold uppercase tracking-wider">Выбрать Облик</span>
      <div className="grid grid-cols-4 gap-2">
        {skins.map((skin) => (
          <button
            key={skin.emoji}
            onClick={() => handleSkinChange(skin.emoji, skin.name, skin.color)}
            className={`aspect-square rounded-xl border text-xl flex items-center justify-center transition-all ${
              activeSkin === skin.emoji
                ? "border-cyan-400 bg-cyan-400/10 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                : "border-white/5 bg-white/5 hover:bg-white/10"
            }`}
          >
            {skin.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
