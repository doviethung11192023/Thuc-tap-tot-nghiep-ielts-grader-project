"use client";

import React from "react";
import { Sparkles } from "lucide-react";
import { RobotMascotLottie } from "./RobotMascotLottie";

interface TutorWelcomeChipsProps {
  botName: string;
  welcomeText: string;
  chips: string[];
  mascotEnabled: boolean;
  mascotSpeed: number;
  onSelectChip: (chip: string) => void;
}

export function TutorWelcomeChips({
  botName,
  welcomeText,
  chips,
  mascotEnabled,
  mascotSpeed,
  onSelectChip,
}: TutorWelcomeChipsProps) {
  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-white border border-zinc-200 p-3.5 shadow-2xs">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative shrink-0">
            <span className="absolute inset-1 rounded-full bg-sky-300/35 blur-md animate-tutor-halo pointer-events-none" />
            <div className={mascotEnabled ? "animate-tutor-float relative z-10" : "relative z-10"}>
              <RobotMascotLottie size={64} speed={Math.min(2.0, mascotSpeed * 1.15)} enabled={mascotEnabled} />
            </div>
          </div>
          <div>
            <p className="text-sm font-black text-zinc-900">{botName}</p>
            <p className="text-[11px] font-semibold text-sky-700">Trợ lý luyện tập IELTS thông minh</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-zinc-600">{welcomeText}</p>
      </div>
      <div className="space-y-1.5">
        {chips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectChip(chip)}
            className="w-full text-left px-3 py-2 rounded-xl bg-white border border-zinc-200 hover:border-sky-300 hover:bg-sky-50/50 text-xs font-semibold text-zinc-700 flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>{chip}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
