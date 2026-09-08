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
  color = "var(--color-primary)",
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
        // `color-mix` instead of gluing hex-alpha suffixes onto the string (`${color}15`).
        // The old form silently required a 6-digit hex, which is why the default here was a
        // literal and could not be the design token. Percentages are the old suffixes
        // converted: 0x15/255 ≈ 8%, 0x30/255 ≈ 19%, 0x22/255 ≈ 13%.
        backgroundColor: `color-mix(in srgb, ${color} 8%, transparent)`,
        border: `2px solid color-mix(in srgb, ${color} 19%, transparent)`,
        boxShadow: `0 0 25px color-mix(in srgb, ${color} 13%, transparent)`,
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
            Safe to stop looping, with one caveat worth keeping honest: all four current files
            carry a `"cm": "rest"` marker (happy tm=118, celebrating tm=107, sad tm=61), so the
            frozen last frame is a face and not a mid-blink — but thinking's marker sits at
            tm=0, which describes its first frame, not a settle point. Whoever replaces these
            with the product's own character must give thinking a real resting pose.
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
