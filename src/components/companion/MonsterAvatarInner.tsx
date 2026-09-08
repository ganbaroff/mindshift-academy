"use client";

import React from "react";
import Lottie from "lottie-react";
import { useReducedMotion } from "framer-motion";
import happyAnimation from "../../../public/lottie/happy.json";
import thinkingAnimation from "../../../public/lottie/thinking.json";
import sadAnimation from "../../../public/lottie/sad.json";
import celebratingAnimation from "../../../public/lottie/celebrating.json";

export type MonsterMood = "happy" | "thinking" | "sad" | "celebrating";

interface MonsterAvatarInnerProps {
  mood?: MonsterMood;
  color?: string;
  size?: number;
  className?: string;
}

export default function MonsterAvatarInner({
  mood = "happy",
  color = "#FF6B4A",
  size = 120,
  className = "",
}: MonsterAvatarInnerProps) {
  const prefersReducedMotion = useReducedMotion();
  let animationData;
  switch (mood) {
    case "thinking":
      animationData = thinkingAnimation;
      break;
    case "sad":
      animationData = sadAnimation;
      break;
    case "celebrating":
      animationData = celebratingAnimation;
      break;
    case "happy":
    default:
      animationData = happyAnimation;
      break;
  }

  return (
    <div
      className={`relative flex items-center justify-center rounded-full overflow-hidden ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}15`,
        border: `2px solid ${color}30`,
        boxShadow: `0 0 25px ${color}22`,
      }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-20 pointer-events-none blur-md"
        style={{
          background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
        }}
      />
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {/* One shot, never a loop. The face used to run `loop` forever for anyone without
            prefers-reduced-motion, which is an animation longer than five seconds with no
            way to stop it — WCAG 2.2.2 — sitting next to a child trying to read a task.
            Safe to stop looping: all four files carry a `"cm": "rest"` marker and settle on
            a readable resting pose, so the frozen last frame is a face and not a mid-blink.
            `key={mood}` remounts the player when the mood changes, because a one-shot
            animation would otherwise stay frozen on the previous mood's last frame and the
            monster would never visibly react again. */}
        <Lottie
          key={mood}
          animationData={animationData}
          loop={false}
          autoplay={!prefersReducedMotion}
          style={{ width: "92%", height: "92%" }}
        />
      </div>
    </div>
  );
}
