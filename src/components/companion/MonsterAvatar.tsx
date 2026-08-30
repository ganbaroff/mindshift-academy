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

const DynamicMonsterAvatarInner = dynamic(
  () => import("./MonsterAvatarInner"),
  {
    ssr: false,
    loading: () => (
      <div 
        className="flex items-center justify-center bg-[var(--surface-strong)] animate-pulse motion-reduce:animate-none rounded-full border border-[var(--border-color)]"
        style={{ width: "100%", height: "100%", minWidth: "32px", minHeight: "32px" }}
      />
    )
  }
);

export function MonsterAvatar({ size = 120, ...props }: MonsterAvatarProps) {
  // Fixed-size wrapper so the dynamic-import `loading` fallback (which next/dynamic
  // never passes component props to, so it can't see `size`) is still constrained to
  // the right box instead of collapsing to a full-width, near-zero-height bar on a
  // cold chunk load (docs/audit/WALKTHROUGH-UX-2026-08-29.md — w1-s1 intro showed an
  // empty beige bar where w2-s3, with the chunk already cached, showed the circle).
  return (
    <div style={{ width: size, height: size, minWidth: size, minHeight: size }}>
      <DynamicMonsterAvatarInner size={size} {...props} />
    </div>
  );
}
