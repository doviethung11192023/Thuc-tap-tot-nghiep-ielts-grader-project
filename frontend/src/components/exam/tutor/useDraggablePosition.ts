"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Point {
  x: number;
  y: number;
}

interface Options {
  storageKey: string;
  width: number;
  height: number;
  margin?: number;
  getDefaultPos: (vw: number, vh: number) => Point;
}

const DRAG_THRESHOLD = 7;

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function useDraggablePosition({
  storageKey,
  width,
  height,
  margin = 14,
  getDefaultPos,
}: Options) {
  const [pos, setPos] = useState<Point | null>(null);
  const [dragging, setDragging] = useState(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const movedRecentlyRef = useRef(false);

  const clampToViewport = useCallback(
    (p: Point): Point => {
      if (typeof window === "undefined") return p;
      const maxX = Math.max(margin, window.innerWidth - width - margin);
      const maxY = Math.max(margin, window.innerHeight - height - margin);
      return { x: clamp(p.x, margin, maxX), y: clamp(p.y, margin, maxY) };
    },
    [width, height, margin]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    let initial = getDefaultPos(window.innerWidth, window.innerHeight);
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          initial = parsed;
        }
      }
    } catch {
      // ignore storage errors
    }
    const raf = window.requestAnimationFrame(() => {
      setPos(clampToViewport(initial));
    });

    const onResize = () => {
      setPos((prev) => (prev ? clampToViewport(prev) : clampToViewport(getDefaultPos(window.innerWidth, window.innerHeight))));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, [storageKey, clampToViewport, getDefaultPos]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, select, input, textarea, a")) return;
      const current = pos || clampToViewport(getDefaultPos(window.innerWidth, window.innerHeight));
      dragStateRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        originX: current.x,
        originY: current.y,
        moved: false,
      };
      movedRecentlyRef.current = false;
    },
    [pos, clampToViewport, getDefaultPos]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const st = dragStateRef.current;
      if (!st || st.pointerId !== e.pointerId) return;
      const dx = e.clientX - st.startX;
      const dy = e.clientY - st.startY;
      if (!st.moved && Math.hypot(dx, dy) >= DRAG_THRESHOLD) {
        st.moved = true;
        movedRecentlyRef.current = true;
        setDragging(true);
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          // ignore synthetic events
        }
      }
      if (st.moved) {
        setPos(clampToViewport({ x: st.originX + dx, y: st.originY + dy }));
      }
    },
    [clampToViewport]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const st = dragStateRef.current;
      if (!st || st.pointerId !== e.pointerId) return;
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
      dragStateRef.current = null;
      setDragging(false);
      setPos((latest) => {
        if (latest) {
          try {
            sessionStorage.setItem(storageKey, JSON.stringify(latest));
          } catch {
            // ignore storage errors
          }
        }
        return latest;
      });
    },
    [storageKey]
  );

  const resetPosition = useCallback(() => {
    if (typeof window === "undefined") return;
    const def = clampToViewport(getDefaultPos(window.innerWidth, window.innerHeight));
    setPos(def);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [clampToViewport, getDefaultPos, storageKey]);

  const consumeWasDragged = useCallback(() => {
    const was = movedRecentlyRef.current;
    movedRecentlyRef.current = false;
    return was;
  }, []);

  return {
    pos,
    dragging,
    dragHandlers: { onPointerDown, onPointerMove, onPointerUp },
    resetPosition,
    consumeWasDragged,
  };
}
