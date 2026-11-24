// Lucian UX/UI Prompt #370 & Motion Primitives ScrollProgress (MIT) · Scroll-Lit Crimson Timeline Track
"use client";

import React, { useRef } from "react";
import { m, useReducedMotion, useScroll, useSpring } from "motion/react";

interface ScrollTimelineTrackProps {
  children: React.ReactNode;
  className?: string;
  trackLeftClass?: string;
}

export function ScrollTimelineTrack({
  children,
  className = "space-y-4",
  trackLeftClass = "left-2.5",
}: ScrollTimelineTrackProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start 85%", "end 55%"],
  });
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 28,
    restDelta: 0.002,
  });

  return (
    <div ref={containerRef} className={`relative pl-6 ${className}`}>
      {/* Static muted baseline rail */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute ${trackLeftClass} top-2 bottom-2 w-0.5 -translate-x-1/2 rounded-full bg-zinc-200`}
      />

      {/* Scroll-driven Crimson progress fill */}
      {prefersReduced ? (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute ${trackLeftClass} top-2 bottom-2 w-0.5 -translate-x-1/2 rounded-full bg-[#932120]/45`}
        />
      ) : (
        <m.span
          aria-hidden="true"
          style={{ scaleY: smoothProgress }}
          className={`pointer-events-none absolute ${trackLeftClass} top-2 bottom-2 w-0.5 -translate-x-1/2 origin-top rounded-full bg-gradient-to-b from-[#932120] via-[#B83230] to-amber-500`}
        />
      )}

      {children}
    </div>
  );
}
