// Lucian UX/UI Prompt #228 & Motion Primitives AnimatedGroup (MIT) · Shared-Gutter Spotlight + FLIP AutoAnimate Grid
"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useReducedMotion } from "motion/react";

interface StaggerGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  autoAnimate?: boolean;
  sharedSpotlight?: boolean;
}

export function StaggerGrid({
  children,
  className = "",
  autoAnimate = true,
  sharedSpotlight = true,
  onPointerMove,
  onPointerLeave,
  ...rest
}: StaggerGridProps) {
  const prefersReduced = useReducedMotion();
  const [animateRef, setAnimateEnabled] = useAutoAnimate<HTMLDivElement>({
    duration: 240,
    easing: "ease-out",
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const rafRef = useRef<number>(0);

  const attachRefs = useCallback(
    (node: HTMLDivElement | null) => {
      containerRef.current = node;
      animateRef(node);
    },
    [animateRef]
  );

  useEffect(() => {
    setAnimateEnabled(Boolean(autoAnimate && !prefersReduced));
  }, [autoAnimate, prefersReduced, setAnimateEnabled]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const applySpotlight = useCallback(() => {
    rafRef.current = 0;
    const container = containerRef.current;
    const pos = pointerPosRef.current;
    if (!container || !pos) return;

    const cards = container.querySelectorAll<HTMLElement>("[data-spotlight-card]");
    cards.forEach((card) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${(pos.x - rect.left).toFixed(1)}px`);
      card.style.setProperty("--my", `${(pos.y - rect.top).toFixed(1)}px`);
      card.style.setProperty("--spot-o", "1");
    });
  }, []);

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerMove?.(e);
    if (!sharedSpotlight || prefersReduced || e.pointerType === "touch") return;
    pointerPosRef.current = { x: e.clientX, y: e.clientY };
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(applySpotlight);
    }
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    onPointerLeave?.(e);
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    pointerPosRef.current = null;
    const container = containerRef.current;
    if (!container) return;
    container.querySelectorAll<HTMLElement>("[data-spotlight-card]").forEach((card) => {
      card.style.setProperty("--spot-o", "0");
    });
  };

  return (
    <div
      ref={attachRefs}
      data-stagger-grid={sharedSpotlight ? "true" : undefined}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={className}
      {...rest}
    >
      {children}
    </div>
  );
}
