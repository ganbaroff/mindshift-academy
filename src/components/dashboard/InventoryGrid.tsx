"use client";

import React from "react";
import { Package, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

interface InventoryItem {
  id: string;
  itemType: string;
  itemId: string;
  acquiredAt: Date | string;
}

interface InventoryGridProps {
  items: InventoryItem[];
}

const ITEM_DISPLAY: Record<string, { emoji: string; label: string; rarity: string }> = {
  cyber_visor: { emoji: "🥽", label: "Кибер-визор", rarity: "Редкий" },
  neon_wings: { emoji: "🦋", label: "Неоновые крылья", rarity: "Эпический" },
  golden_crown: { emoji: "👑", label: "Золотая корона", rarity: "Легендарный" },
  flame_aura: { emoji: "🔥", label: "Пламенная аура", rarity: "Редкий" },
  ice_shield: { emoji: "🛡️", label: "Ледяной щит", rarity: "Обычный" },
  star_cape: { emoji: "⭐", label: "Звёздный плащ", rarity: "Эпический" },
};

const RARITY_COLORS: Record<string, string> = {
  "Обычный": "text-gray-400 bg-gray-500/10 border-gray-500/20",
  "Редкий": "text-violet-400 bg-violet-500/10 border-violet-500/20",
  "Эпический": "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  "Легендарный": "text-amber-400 bg-amber-500/10 border-amber-500/20",
};

export const InventoryGrid = ({ items }: InventoryGridProps) => {
  const shouldReduceMotion = useReducedMotion();

  if (items.length === 0) {
    return (
      <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
        <Package className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-sm font-semibold text-gray-400">Инвентарь пуст</p>
        <p className="text-xs text-gray-500 mt-1">
          Заходи каждый день, чтобы получать награды через Календарь Наград!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">
          Коллекция ({items.length})
        </h3>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {items.map((item, idx) => {
          const display = ITEM_DISPLAY[item.itemId] || {
            emoji: "📦",
            label: item.itemId.replace(/_/g, " "),
            rarity: "Обычный",
          };
          const rarityClass = RARITY_COLORS[display.rarity] || RARITY_COLORS["Обычный"];

          return (
            <motion.div
              key={item.id}
              initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
              animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
              transition={shouldReduceMotion ? undefined : { delay: idx * 0.08, duration: 0.3 }}
              className="rounded-2xl border border-white/8 bg-white/[0.03] p-3 flex flex-col items-center gap-2 hover:bg-white/[0.06] transition-colors"
            >
              <span className="text-2xl" aria-hidden="true">{display.emoji}</span>
              <span className="text-[11px] font-bold text-white/80 text-center leading-tight">
                {display.label}
              </span>
              <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${rarityClass}`}>
                {display.rarity}
              </span>
              {item.itemType === "skin_shard" && (
                <span className="text-[9px] text-gray-500 font-bold">Осколок</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
