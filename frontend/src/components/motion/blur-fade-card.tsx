// Lucian UX/UI Prompt #251 & Magic UI BlurFade (MIT) · Staggered Blur-Fade Scroll Reveal
"use client";

import React from "react";
import { m, useReducedMotion } from "motion/react";

interface BlurFadeCardProps {
  children: React.ReactNode;
  className?: string;
  index?: number;
  delay?: number;
  duration?: number;
  yOffset?: number;
  blur?: string;
  inView?: boolean;
  as?: "div" | "article" | "section";
}

const EASE_OUT_QUART = [0.22, 1, 0.36, 1] as const;

export function BlurFadeCard({
  children,
  className,
  index = 0,
  delay,
  duration = 0.44,
  yOffset = 14,
  blur = "4px",
  inView = true,
  as = "div",
}: BlurFadeCardProps) {
  const prefersReduced = useReducedMotion();
  const computedDelay = delay ?? Math.min(Math.max(0, index) * 0.045, 0.27);

  if (prefersReduced) {
    const Tag = as;
    return <Tag className={className}>{children}</Tag>;
  }

  const initialVariant = {
    opacity: 0,
    y: yOffset,
    scale: 0.985,
    filter: `blur(${blur})`,
  };
  const visibleVariant = {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: "blur(0px)",
  };
  const transitionConfig = {
    duration,
    delay: computedDelay,
    ease: EASE_OUT_QUART,
  };

  const MotionTag = as === "article" ? m.article : as === "section" ? m.section : m.div;

  if (!inView) {
    return (
      <MotionTag
        initial={initialVariant}
        animate={visibleVariant}
        transition={transitionConfig}
        className={className}
      >
        {children}
      </MotionTag>
    );
  }

  return (
    <MotionTag
      initial={initialVariant}
      whileInView={visibleVariant}
      viewport={{ once: true, amount: "some" }}
      transition={transitionConfig}
      className={className}
    >
      {children}
    </MotionTag>
  );
}
