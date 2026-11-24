// Lucian UX/UI Prompt #050 & #228 & React Bits SpotlightCard (MIT) · Zero-Purple Academic Spotlight
"use client";

import React, { useRef } from "react";
import { useReducedMotion } from "motion/react";

export type SpotlightTone = "crimson" | "amber" | "emerald" | "sky";

const TONE_TOKENS: Record<SpotlightTone, { border: string; border2: string; fill: string }> = {
  crimson: {
    border: "rgba(147, 33, 32, 0.34)",
    border2: "rgba(217, 119, 6, 0.16)",
    fill: "rgba(147, 33, 32, 0.045)",
  },
  amber: {
    border: "rgba(217, 119, 6, 0.36)",
    border2: "rgba(147, 33, 32, 0.16)",
    fill: "rgba(217, 119, 6, 0.05)",
  },
  emerald: {
    border: "rgba(5, 150, 105, 0.32)",
    border2: "rgba(2, 132, 199, 0.14)",
    fill: "rgba(5, 150, 105, 0.045)",
  },
  sky: {
    border: "rgba(2, 132, 199, 0.30)",
    border2: "rgba(147, 33, 32, 0.14)",
    fill: "rgba(2, 132, 199, 0.045)",
  },
};

interface SpotlightCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  tone?: SpotlightTone;
  enableTilt?: boolean;
}

export function SpotlightCard({
  children,
  className = "",
  tone = "crimson",
  enableTilt = false,
  style,
  onPointerMove,
  onPointerLeave,
  ...rest
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const tokens = TONE_TOKENS[tone];

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    if (prefersReduced || e.pointerType === "touch") return;
    const el = cardRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const lx = e.clientX - rect.left;
    const ly = e.clientY - rect.top;

    // When standalone (outside a StaggerGrid), drive own spotlight coordinates directly
    if (!el.closest("[data-stagger-grid]")) {
      el.style.setProperty("--mx", `${lx.toFixed(1)}px`);
      el.style.setProperty("--my", `${ly.toFixed(1)}px`);
      el.style.setProperty("--spot-o", "1");
    }

    if (enableTilt) {
      const nx = lx / rect.width - 0.5;
      const ny = 0.5 - ly / rect.height;
      el.style.setProperty("--ry", `${(nx * 3.2).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${(ny * 3.2).toFixed(2)}deg`);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(e);
    const el = cardRef.current;
    if (!el) return;

    if (!el.closest("[data-stagger-grid]")) {
      el.style.setProperty("--spot-o", "0");
    }
    if (enableTilt) {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    }
  };

  return (
    <div
      ref={cardRef}
      data-spotlight-card="true"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      style={
        {
          "--spot-border": tokens.border,
          "--spot-border-2": tokens.border2,
          "--spot-fill": tokens.fill,
          ...style,
        } as React.CSSProperties
      }
      className={`spotlight-card ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
