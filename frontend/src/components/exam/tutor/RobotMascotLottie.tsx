"use client";

import React, { useEffect, useRef, useState } from "react";

interface RobotMascotLottieProps {
  size?: number;
  speed?: number;
  enabled?: boolean;
  className?: string;
}

let cachedAnimPromise: Promise<Record<string, unknown> | null> | null = null;

function loadRobotAnimationData(): Promise<Record<string, unknown> | null> {
  if (!cachedAnimPromise) {
    cachedAnimPromise = fetch("/animations/ai-tutor-robot.json")
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null);
  }
  return cachedAnimPromise;
}

export function RobotMascotLottie({
  size = 56,
  speed = 0.85,
  enabled = true,
  className = "",
}: RobotMascotLottieProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    let anim: {
      destroy: () => void;
      setSpeed: (s: number) => void;
      pause: () => void;
      play: () => void;
      goToAndStop: (frame: number, isFrame?: boolean) => void;
    } | null = null;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const shouldAnimate = enabled && !prefersReduced;

    const onVisibility = () => {
      if (!anim || !shouldAnimate) return;
      if (document.hidden) anim.pause();
      else anim.play();
    };

    (async () => {
      try {
        const [lottieMod, animData] = await Promise.all([
          import("lottie-web/build/player/lottie_light"),
          loadRobotAnimationData(),
        ]);
        if (!active || !containerRef.current || !animData) return;

        const lottie = lottieMod.default || lottieMod;
        const cloned =
          typeof structuredClone === "function"
            ? structuredClone(animData)
            : JSON.parse(JSON.stringify(animData));
        anim = lottie.loadAnimation({
          container: containerRef.current,
          renderer: "svg",
          loop: shouldAnimate,
          autoplay: shouldAnimate,
          animationData: cloned,
        });
        anim.setSpeed(Math.max(0.5, Math.min(2.0, speed)));
        if (!shouldAnimate) {
          anim.goToAndStop(18, true);
        }
        setReady(true);
        document.addEventListener("visibilitychange", onVisibility);
      } catch {
        // Giữ nguyên huy hiệu AI dự phòng nếu trình duyệt thiếu RAM hoặc lỗi tải chunk
      }
    })();

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      anim?.destroy();
    };
  }, [enabled, speed]);

  return (
    <div
      style={{ width: size, height: Math.round(size * 0.86) }}
      className={`relative flex items-center justify-center shrink-0 select-none ${className}`}
      aria-hidden="true"
    >
      <div ref={containerRef} className="w-full h-full" />
      {!ready && (
        <div className="absolute inset-1 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-700 font-black text-xs">
          AI
        </div>
      )}
    </div>
  );
}
