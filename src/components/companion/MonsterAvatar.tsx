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

export function MonsterAvatar(props: MonsterAvatarProps) {
  return <DynamicMonsterAvatarInner {...props} />;
}
