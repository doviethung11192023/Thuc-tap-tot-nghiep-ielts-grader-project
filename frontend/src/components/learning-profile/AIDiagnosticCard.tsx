"use client";

import React from "react";
import { MessageSquareText, HelpCircle } from "lucide-react";
import type { AIDiagnosticFeedback } from "@/types/learning-profile";

interface AIDiagnosticCardProps {
  feedback: AIDiagnosticFeedback;
}

export function AIDiagnosticCard({ feedback }: AIDiagnosticCardProps) {
  const items = [
    { skill: "Listening", text: feedback.listening, dotColor: "bg-amber-500" },
    { skill: "Reading", text: feedback.reading, dotColor: "bg-emerald-500" },
    { skill: "Writing", text: feedback.writing, dotColor: "bg-blue-500" },
    { skill: "Speaking", text: feedback.speaking, dotColor: "bg-rose-500" },
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50/70 via-sky-50/40 to-white rounded-3xl border border-blue-200/80 p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
          <MessageSquareText className="w-4 h-4" />
        </div>
        <h3 className="font-black text-zinc-900 text-sm tracking-tight flex items-center gap-1.5">
          Nhận xét năng lực AI
          <span title="Được hệ thống phân tích từ xu hướng và độ biến thiên điểm số thực tế" className="inline-flex">
            <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
          </span>
        </h3>
      </div>

      <div className="space-y-3.5 bg-white/80 p-4 sm:p-5 rounded-2xl border border-blue-100">
        {items.map((it) => (
          <div key={it.skill} className="text-xs leading-relaxed">
            <div className="flex items-center gap-2 font-bold text-zinc-800 mb-1">
              <span className={`w-2 h-2 rounded-full ${it.dotColor}`} />
              <span>{it.skill}</span>
            </div>
            <p className="text-zinc-600 pl-4">{it.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
