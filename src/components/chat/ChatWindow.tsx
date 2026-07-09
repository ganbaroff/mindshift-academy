"use client";

import React, { useRef, useEffect } from "react";
import { useGameStore } from "@/stores/game";
import { MonsterAvatar } from "@/components/companion/MonsterAvatar";

export const ChatWindow = () => {
  const messages = useGameStore((state) => state.messages);
  const monsterColor = useGameStore((state) => state.monsterColor);
  const latency = useGameStore((state) => state.latency);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A JS `behavior` option overrides the CSS scroll-behavior guard, so branch
    // on the OS reduced-motion preference to avoid animating for those users.
    const smooth =
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    chatEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
  }, [messages, latency]);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-relevant="additions"
      aria-label="Чат с питомцем"
      className="flex-grow border border-white/5 bg-black/20 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto max-h-[380px] min-h-[300px]"
    >
      {messages.map((msg) => (
        <div 
          key={msg.id}
          className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "self-end flex-row-reverse" : ""}`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 overflow-hidden ${
            msg.sender === "user" 
              ? "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)] text-white" 
              : "bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] text-white"
          }`}>
            {msg.sender === "user" ? (
              msg.avatar
            ) : (
              <MonsterAvatar size={32} mood="happy" color={monsterColor} />
            )}
          </div>
          <div className={`p-3 rounded-2xl border text-sm leading-relaxed min-w-0 break-words ${
            msg.sender === "user"
              ? "bg-violet-500/10 border-violet-500/20"
              : "bg-cyan-500/5 border-cyan-500/10"
          }`}>
            {msg.text}
          </div>
        </div>
      ))}
      {latency === "Загрузка..." && (
        <div className="flex gap-3 max-w-[85%]">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)] overflow-hidden">
            <MonsterAvatar size={32} mood="thinking" color={monsterColor} />
          </div>
          <div className="p-3.5 rounded-2xl border border-cyan-500/10 bg-cyan-500/5 text-sm flex items-center gap-1.5 min-w-[60px] justify-center">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce motion-reduce:animate-none" />
          </div>
        </div>
      )}
      <div ref={chatEndRef} />
    </div>
  );
};
