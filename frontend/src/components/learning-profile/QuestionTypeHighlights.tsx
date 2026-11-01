"use client";

import React from "react";
import { Flame, ShieldCheck, TrendingUp, AlertTriangle } from "lucide-react";
import type { QuestionTypeHighlights as HighlightsData } from "@/types/learning-profile";

interface QuestionTypeHighlightsProps {
  highlights: HighlightsData;
}

export function QuestionTypeHighlights({ highlights }: QuestionTypeHighlightsProps) {
  const cards = [
    {
      id: "most_practiced",
      data: highlights.most_practiced,
      icon: <Flame className="w-4 h-4 text-amber-600" />,
      border: "border-amber-200 bg-amber-50/40",
      tag: "bg-amber-100 text-amber-800",
    },
    {
      id: "most_stable",
      data: highlights.most_stable,
      icon: <ShieldCheck className="w-4 h-4 text-blue-600" />,
      border: "border-blue-200 bg-blue-50/40",
      tag: "bg-blue-100 text-blue-800",
    },
    {
      id: "most_improved",
      data: highlights.most_improved,
      icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
      border: "border-emerald-200 bg-emerald-50/40",
      tag: "bg-emerald-100 text-emerald-800",
    },
    {
      id: "needs_improvement",
      data: highlights.needs_improvement,
      icon: <AlertTriangle className="w-4 h-4 text-rose-600" />,
      border: "border-rose-200 bg-rose-50/40",
      tag: "bg-rose-100 text-rose-800",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((c) => {
        const item = c.data;
        if (!item) return null;

        return (
          <div
            key={c.id}
            className={`p-4 sm:p-5 rounded-2xl border ${c.border} shadow-2xs flex flex-col justify-between`}
          >
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${c.tag}`}>
                  {c.icon}
                  {item.title}
                </span>
              </div>
              <h4 className="font-black text-zinc-900 text-sm tracking-tight mb-2">
                {item.type_name}
              </h4>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-zinc-200/50 text-xs">
              <div className="flex items-center justify-between text-zinc-500 font-medium">
                <span>Tổng số lượt làm bài</span>
                <strong className="text-zinc-800 font-bold">{item.total_attempts}</strong>
              </div>
              <div className="flex items-center justify-between text-zinc-500 font-medium">
                <span>Tỷ lệ chính xác</span>
                <span className="font-black text-zinc-900">{item.accuracy_rate}%</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
