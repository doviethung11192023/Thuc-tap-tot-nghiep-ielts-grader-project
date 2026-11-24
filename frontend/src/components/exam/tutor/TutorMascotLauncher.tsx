"use client";

import React, { useCallback } from "react";
import { GripHorizontal, Sparkles } from "lucide-react";
import { RobotMascotLottie } from "./RobotMascotLottie";
import { useDraggablePosition } from "./useDraggablePosition";

interface TutorMascotLauncherProps {
  botName: string;
  speed?: number;
  enabled?: boolean;
  statusTone?: "cyan" | "amber";
  onOpen: () => void;
}

export function TutorMascotLauncher({
  botName,
  speed = 0.95,
  enabled = true,
  statusTone = "cyan",
  onOpen,
}: TutorMascotLauncherProps) {
  const getDefaultPos = useCallback((vw: number, vh: number) => ({ x: vw - 146, y: vh - 138 }), []);
  const { pos, dragging, dragHandlers, consumeWasDragged } = useDraggablePosition({
    storageKey: "moonbot_launcher_pos_v1",
    width: 130,
    height: 122,
    margin: 12,
    getDefaultPos,
  });

  const handleClick = () => {
    if (consumeWasDragged()) return;
    onOpen();
  };

  return (
    <div
      data-testid="ai-tutor-launcher"
      role="button"
      tabIndex={0}
      aria-label={`Mở ${botName} (kéo để di chuyển)`}
      title={`Nhấn để mở ${botName} · Kéo để di chuyển`}
      style={
        pos
          ? {
              left: 0,
              top: 0,
              transform: `translate3d(${pos.x}px, ${pos.y}px, 0)${dragging ? " scale(1.05)" : ""}`,
              willChange: dragging ? "transform" : undefined,
            }
          : { right: 20, bottom: 20 }
      }
      onPointerDown={dragHandlers.onPointerDown}
      onPointerMove={dragHandlers.onPointerMove}
      onPointerUp={dragHandlers.onPointerUp}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`fixed z-40 group flex flex-col items-center select-none touch-none focus:outline-none ${
        dragging ? "cursor-grabbing" : "cursor-grab"
      }`}
    >
      <div className="pointer-events-none opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-200 mb-1 px-2.5 py-1 rounded-full bg-white/95 border border-sky-200 shadow-md text-[11px] font-extrabold text-sky-800 flex items-center gap-1 whitespace-nowrap">
        <Sparkles className="w-3 h-3 text-amber-500" />
        Hỏi mình nhé!
      </div>

      <div className="relative flex items-center justify-center -mb-3">
        <span
          aria-hidden="true"
          className="absolute inset-1 rounded-full bg-sky-400/35 blur-lg animate-tutor-halo pointer-events-none"
        />
        <span
          aria-hidden="true"
          className="absolute inset-2 rounded-full border-2 border-cyan-300/60 opacity-0 group-hover:opacity-100 group-hover:scale-110 transition-all duration-300 pointer-events-none"
        />
        <div
          className={`relative z-10 drop-shadow-[0_10px_14px_rgba(14,165,233,0.32)] transition-transform duration-200 group-hover:scale-110 ${
            enabled && !dragging ? "animate-tutor-float" : ""
          }`}
        >
          <RobotMascotLottie
            size={88}
            speed={Math.min(2.0, speed * 1.15)}
            enabled={enabled}
          />
        </div>
      </div>

      <span className="relative z-10 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#932120] text-white text-xs font-extrabold shadow-[0_8px_20px_rgba(147,33,32,0.35)] border border-rose-300/50 group-hover:bg-[#7a1a19] transition-colors">
        <span
          className={`w-2 h-2 rounded-full ${
            statusTone === "amber" ? "bg-amber-300" : "bg-cyan-300 animate-pulse"
          }`}
        />
        <span>{botName}</span>
        <GripHorizontal className="w-3.5 h-3.5 text-rose-200/80 ml-0.5" />
      </span>
    </div>
  );
}
