"use client";

import React, { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export const CrystalUpsellButton = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePurchase = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/parent/reward-crystals", { method: "POST" });
      if (!res.ok) throw new Error("Purchase failed");

      const data = await res.json();
      if (data.success) {
        setMessage("💎 100 кристаллов успешно зачислены питомцу!");
        // Refresh server component to update crystals count in UI
        router.refresh();
        
        // Clear message after 3 seconds
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
      setMessage("⚠️ Не удалось совершить покупку.");
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 flex flex-col gap-2">
      <button
        onClick={handlePurchase}
        disabled={loading}
        className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-extrabold py-3 px-5 rounded-xl shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transform transition-all text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4 text-black fill-black" />
        )}
        <span>Наградить: 100 💎 за 2 AZN</span>
      </button>
      
      {message && (
        <p className={`text-[11px] font-bold text-center mt-1 transition-all ${
          message.includes("⚠️") ? "text-violet-400" : "text-amber-400"
        }`}>
          {message}
        </p>
      )}
    </div>
  );
};
