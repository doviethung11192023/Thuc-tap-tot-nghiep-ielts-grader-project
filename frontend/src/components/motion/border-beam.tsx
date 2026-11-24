// Magic UI BorderBeam / Motion Primitives BorderTrail (MIT) · Pure CSS GPU Perimeter Beam
"use client";

import React from "react";
import { useReducedMotion } from "motion/react";

export type BorderBeamTone = "crimson-amber" | "gold" | "emerald";

const BEAM_COLORS: Record<BorderBeamTone, { c1: string; c2: string }> = {
  "crimson-amber": {
    c1: "rgba(147, 33, 32, 0.78)",
    c2: "rgba(217, 119, 6, 0.86)",
  },
  gold: {
    c1: "rgba(217, 119, 6, 0.85)",
    c2: "rgba(251, 191, 36, 0.95)",
  },
  emerald: {
    c1: "rgba(5, 150, 105, 0.78)",
    c2: "rgba(16, 185, 129, 0.88)",
  },
};

interface BorderBeamProps {
  tone?: BorderBeamTone;
  duration?: number;
  className?: string;
}

export function BorderBeam({
  tone = "crimson-amber",
  duration = 9,
  className = "",
}: BorderBeamProps) {
  const prefersReduced = useReducedMotion();
  if (prefersReduced) return null;

  const palette = BEAM_COLORS[tone];

  return (
    <span
      aria-hidden="true"
      className={`moonlab-border-beam ${className}`}
      style={
        {
          "--beam-c1": palette.c1,
          "--beam-c2": palette.c2,
          "--beam-duration": `${duration}s`,
        } as React.CSSProperties
      }
    />
  );
}
