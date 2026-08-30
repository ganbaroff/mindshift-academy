"use client";

import dynamic from "next/dynamic";
import React from "react";

export type MonsterMood = "happy" | "thinking" | "sad" | "celebrating";

interface MonsterAvatarProps {
  mood?: MonsterMood;
  color?: string;
  size?: number;
  className?: string;
}

// next/dynamic's `loading` callback is a module-level function — it never
// receives the props passed to the rendered instance, so it can't see
// `mood`/`color` to draw a face on its own. A <Suspense> wrapper around the
// lazy import was tried to fix that (so the fallback could close over those
// props) but it made the whole avatar disappear until the chunk resolved,
// which is worse than the original empty-circle bug — reverted.
//
// Instead: the OUTER component always paints a static base layer (tinted
// circle + mood glyph) as the very first frame, with the lazy Lottie
// component absolutely positioned on top of it (inset-0). Once the chunk
// mounts, Inner's own opaque circle + Lottie artwork visually cover the
// glyph underneath — no Suspense, no empty first frame.
const DynamicMonsterAvatarInner = dynamic(() => import("./MonsterAvatarInner"), {
  ssr: false,
  loading: () => null,
});

const MOOD_GLYPH: Record<MonsterMood, string> = {
  happy: "🙂",
  thinking: "🤔",
  sad: "😢",
  celebrating: "🎉",
};

export function MonsterAvatar({ mood = "happy", color = "#8b5cf6", size = 120, ...props }: MonsterAvatarProps) {
  // Fixed-size, relatively-positioned wrapper so the base layer and the
  // absolutely-positioned Lottie layer stack exactly on top of each other
  // instead of collapsing to a full-width, near-zero-height bar on a cold
  // chunk load (docs/audit/WALKTHROUGH-UX-2026-08-29.md — w1-s1 intro showed
  // an empty beige circle where w2-s3, with the chunk already cached, showed
  // the loaded face).
  return (
    <div className="relative" style={{ width: size, height: size, minWidth: size, minHeight: size }}>
      <div
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center rounded-full border border-[var(--border-color)]"
        style={{
          backgroundColor: `${color}15`,
          borderColor: `${color}30`,
        }}
      >
        <span style={{ fontSize: size * 0.5, lineHeight: 1 }}>{MOOD_GLYPH[mood]}</span>
      </div>
      <div className="absolute inset-0">
        <DynamicMonsterAvatarInner mood={mood} color={color} size={size} {...props} />
      </div>
    </div>
  );
}
