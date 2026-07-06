"use client";

import React from "react";
import { MotionConfig } from "framer-motion";

/**
 * App-wide framer-motion config. `reducedMotion="user"` makes ALL framer
 * animations honor the OS prefers-reduced-motion setting (framer v12 does NOT
 * do this automatically, and CSS cannot touch framer's rAF-driven transforms).
 * Client boundary required — MotionConfig relies on React context.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
