"use client";

import React from "react";
import { PenTool, Mic, TrendingUp } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { BlurFadeCard, SpotlightCard } from "@/components/motion";
import type { CriterionMasteryItem } from "@/types/learning-profile";

interface CriterionMasteryCardsProps {
  mastery?: {
    writing: CriterionMasteryItem[];
    speaking: CriterionMasteryItem[];
  };
}

export function CriterionMasteryCards({ mastery }: CriterionMasteryCardsProps) {
  const prefersReduced = useReducedMotion();
  if (!mastery) return null;

  const renderGroup = (
    title: string,
    icon: React.ReactNode,
    items: CriterionMasteryItem[],
    index: number,
    tone: "crimson" | "sky"
  ) => (
    <BlurFadeCard index={index}>
      <SpotlightCard
        tone={tone}
        className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-2xs space-y-4 h-full overflow-hidden"
      >
        <div className="flex items-center gap-2 border-b border-zinc-100 pb-3 relative z-10">
          {icon}
          <div>
            <h3 className="text-sm font-black text-zinc-900">{title}</h3>
            <p className="text-[11px] text-zinc-500">Điểm trung bình 5 lượt chấm gần nhất đối chiếu mục tiêu</p>
          </div>
        </div>

        <div className="space-y-3 relative z-10">
          {items.map((item) => {
            const pct = Math.min(100, Math.round((item.average_band / 9.0) * 100));
            const barColor =
              item.status === "strong" ? "bg-emerald-500" : item.status === "improving" ? "bg-blue-600" : "bg-amber-500";
            return (
              <div key={item.code} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-zinc-800">
                    <span className="inline-block w-10 text-[#932120] font-black">{item.code}</span>
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2">
                    {item.delta !== null && item.delta !== 0 && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          item.delta > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                        }`}
                      >
                        <TrendingUp className="w-2.5 h-2.5" /> {item.delta > 0 ? `+${item.delta}` : item.delta}
                      </span>
                    )}
                    <span className="font-black text-zinc-900 tabular-nums">
                      {item.average_band > 0 ? item.average_band.toFixed(1) : "--"}
                      <span className="text-zinc-400 font-normal"> / {item.target_band.toFixed(1)}</span>
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <m.div
                    initial={prefersReduced ? false : { width: 0 }}
                    whileInView={{ width: `${pct}%` }}
                    viewport={{ once: true, amount: 0.2 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-full ${barColor}`}
                    style={prefersReduced ? { width: `${pct}%` } : undefined}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SpotlightCard>
    </BlurFadeCard>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {renderGroup("Phân tích 5 tiêu chí Writing", <PenTool className="w-4 h-4 text-[#932120]" />, mastery.writing, 0, "crimson")}
      {renderGroup("Phân tích 4 tiêu chí Speaking", <Mic className="w-4 h-4 text-blue-600" />, mastery.speaking, 1, "sky")}
    </div>
  );
}
