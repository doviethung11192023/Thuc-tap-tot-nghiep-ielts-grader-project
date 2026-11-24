"use client";

import React, { useState } from "react";
import { X, MoreVertical, RotateCcw, BatteryCharging, GripVertical, Move, PanelRight, LocateFixed } from "lucide-react";
import type { TutorQuestionGroup, TutorQuota } from "@/services/ai-tutor";
import { RobotMascotLottie } from "./RobotMascotLottie";

interface TutorDrawerHeaderProps {
  botName: string;
  skill: "listening" | "reading";
  quota: TutorQuota;
  language: "vi" | "en";
  mascotEnabled: boolean;
  mascotSpeed: number;
  docked: boolean;
  dragging?: boolean;
  dragHandlers?: {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => void;
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => void;
  };
  questionGroups: TutorQuestionGroup[];
  selectedGroupId: string;
  selectedQuestionNo: number | null;
  currentQuestionNumbers: number[];
  onLanguageChange: (lang: "vi" | "en") => void;
  onGroupChange: (groupId: string) => void;
  onQuestionChange: (qNo: number | null) => void;
  onToggleDock: () => void;
  onResetPos: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function TutorDrawerHeader({
  botName,
  skill,
  quota,
  language,
  mascotEnabled,
  mascotSpeed,
  docked,
  dragging,
  dragHandlers,
  questionGroups,
  selectedGroupId,
  selectedQuestionNo,
  currentQuestionNumbers,
  onLanguageChange,
  onGroupChange,
  onQuestionChange,
  onToggleDock,
  onResetPos,
  onReset,
  onClose,
}: TutorDrawerHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const quotaColor =
    quota.remaining <= 5
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-emerald-50 text-emerald-700 border-emerald-200";

  return (
    <>
      <div
        data-testid="ai-tutor-drag-handle"
        onPointerDown={!docked ? dragHandlers?.onPointerDown : undefined}
        onPointerMove={!docked ? dragHandlers?.onPointerMove : undefined}
        onPointerUp={!docked ? dragHandlers?.onPointerUp : undefined}
        onDoubleClick={!docked ? onResetPos : undefined}
        title={!docked ? "Kéo để di chuyển khung chat · Nhấn đúp để đặt lại vị trí" : undefined}
        className={`bg-white border-b border-zinc-200 px-3 py-2.5 flex items-center justify-between gap-1.5 shrink-0 select-none ${
          !docked ? (dragging ? "cursor-grabbing touch-none" : "cursor-grab touch-none") : ""
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {!docked && <GripVertical className="w-4 h-4 text-zinc-400 shrink-0" />}
          <div className="relative shrink-0">
            <span className="absolute inset-0 rounded-full bg-sky-300/30 blur-sm pointer-events-none" />
            <RobotMascotLottie size={42} speed={Math.min(2.0, mascotSpeed * 1.1)} enabled={mascotEnabled} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-black text-zinc-900 truncate">{botName}</span>
              <span
                data-testid="ai-tutor-quota"
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border text-[10px] font-extrabold ${quotaColor}`}
              >
                <BatteryCharging className="w-3 h-3" />
                {quota.remaining}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide">
              {skill === "reading" ? "Reading Tutor" : "Listening Tutor"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0 relative">
          <div className="flex rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 text-[10px] font-bold">
            {(["vi", "en"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => onLanguageChange(l)}
                className={`px-1.5 py-0.5 rounded-md cursor-pointer transition-colors ${language === l ? "bg-white text-[#932120] shadow-2xs" : "text-zinc-500"}`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={onToggleDock}
            data-testid="ai-tutor-toggle-dock"
            className="hidden xl:inline-flex p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
            title={docked ? "Tách thành cửa sổ kéo thả tự do" : "Ghim vào cạnh phải"}
          >
            {docked ? <Move className="w-3.5 h-3.5" /> : <PanelRight className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
            title="Tùy chọn"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-8 top-9 w-44 rounded-xl bg-white border border-zinc-200 shadow-lg py-1 z-20 text-xs">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onReset(); }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 text-zinc-700 hover:bg-zinc-50 font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {language === "en" ? "New conversation" : "Phiên chat mới"}
              </button>
              {!docked && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onResetPos(); }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-zinc-700 hover:bg-zinc-50 font-semibold cursor-pointer"
                >
                  <LocateFixed className="w-3.5 h-3.5" />
                  {language === "en" ? "Reset popup position" : "Đặt lại vị trí cửa sổ"}
                </button>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer"
            title="Thu gọn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-white/95 border-b border-zinc-200 px-3 py-2 shrink-0">
        <div className="flex items-center gap-1.5">
          <select
            value={selectedGroupId}
            onChange={(e) => onGroupChange(e.target.value)}
            className="flex-1 min-w-0 text-xs font-bold text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#932120]"
          >
            {questionGroups.map((g) => (
              <option key={g.id} value={g.id}>
                Part {g.section_no} · {g.label}
              </option>
            ))}
          </select>
          <select
            value={selectedQuestionNo ?? ""}
            onChange={(e) => onQuestionChange(e.target.value ? Number(e.target.value) : null)}
            className="w-24 text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#932120]"
          >
            <option value="">{language === "en" ? "All Qs" : "Cả nhóm"}</option>
            {currentQuestionNumbers.map((qn) => (
              <option key={qn} value={qn}>
                Q{qn}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}
