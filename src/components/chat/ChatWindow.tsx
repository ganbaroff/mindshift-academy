"use client";

import React, { useRef, useEffect } from "react";
import { useGameStore } from "@/stores/game";

export const ChatWindow = () => {
  const messages = useGameStore((state) => state.messages);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-grow border border-white/5 bg-black/20 rounded-xl p-4 flex flex-col gap-4 overflow-y-auto max-h-[380px] min-h-[300px]">
      {messages.map((msg) => (
        <div 
          key={msg.id}
          className={`flex gap-3 max-w-[85%] ${msg.sender === "user" ? "self-end flex-row-reverse" : ""}`}
        >
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 ${
            msg.sender === "user" 
              ? "bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)] text-white" 
              : "bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)] text-white"
          }`}>
            {msg.avatar}
          </div>
          <div className={`p-3 rounded-2xl border text-sm leading-relaxed ${
            msg.sender === "user"
              ? "bg-violet-500/10 border-violet-500/20"
              : "bg-cyan-500/5 border-cyan-500/10"
          }`}>
            {msg.text}
          </div>
        </div>
      ))}
      <div ref={chatEndRef} />
    </div>
  );
};
