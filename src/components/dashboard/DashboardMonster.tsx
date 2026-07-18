"use client";

import React from "react";
import { MonsterAvatar } from "@/components/companion/MonsterAvatar";

interface DashboardMonsterProps {
  color?: string;
  moodValue?: number;
}

export function DashboardMonster({ color = "#8b5cf6", moodValue = 78 }: DashboardMonsterProps) {
  // Low mood displays a sad/crying avatar, healthy mood displays happy
  const mood = moodValue < 50 ? "sad" : "happy";
  
  return <MonsterAvatar mood={mood} color={color} size={48} />;
}
