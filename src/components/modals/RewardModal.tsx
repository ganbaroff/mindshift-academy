"use client";

import React from "react";
import { useGameStore } from "@/stores/game";

export const RewardModal = () => {
  const isModalOpen = useGameStore((state) => state.isModalOpen);
  const modalDesc = useGameStore((state) => state.modalDesc);
  const setIsModalOpen = useGameStore((state) => state.setIsModalOpen);

  if (!isModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-[#090d16] border-2 border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.25)] rounded-3xl p-8 max-w-[450px] w-full text-center relative animate-in zoom-in-95 cubic-bezier(0.34, 1.56, 0.64, 1) duration-300">
        <div className="w-24 h-24 rounded-full bg-amber-500/10 border-2 border-amber-500 flex items-center justify-center text-5xl mx-auto mb-6 shadow-[0_0_20px_rgba(245,158,11,0.3)] animate-spin-slow">
          👾
        </div>
        <h3 className="font-extrabold text-2xl text-amber-500 mb-2">Ачивка Разблокирована!</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          {modalDesc}
        </p>
        <div className="text-2xl font-black text-amber-400 mb-6">
          +150 XP & +10 💎
        </div>
        <button 
          onClick={() => setIsModalOpen(false)}
          className="bg-amber-500 hover:bg-amber-600 text-black font-extrabold px-8 py-3 rounded-full text-sm hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transform hover:scale-105 transition-all"
        >
          Супер, продолжить!
        </button>
      </div>
    </div>
  );
};
