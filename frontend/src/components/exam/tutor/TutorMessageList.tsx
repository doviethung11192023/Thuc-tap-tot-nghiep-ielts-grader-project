"use client";

import React, { useState } from "react";
import { ThumbsUp, ThumbsDown, LockOpen, ShieldCheck, Sparkles } from "lucide-react";
import type { TutorMessage } from "@/services/ai-tutor";
import { RobotMascotLottie } from "./RobotMascotLottie";
import { TutorFormattedText } from "./TutorFormattedText";

interface TutorMessageListProps {
  messages: TutorMessage[];
  streamingText: string;
  isStreaming: boolean;
  language: "vi" | "en";
  enableReadingHighlight: boolean;
  allowUnlock: boolean;
  selectedQuestionNo: number | null;
  mascotEnabled: boolean;
  mascotSpeed: number;
  onHighlightParagraph?: (paragraph: string) => void;
  onFeedback: (messageId: string, rating: "up" | "down") => void;
  onRequestUnlock: (questionNo: number) => void;
}

export function TutorMessageList({
  messages,
  streamingText,
  isStreaming,
  language,
  enableReadingHighlight,
  allowUnlock,
  selectedQuestionNo,
  mascotEnabled,
  mascotSpeed,
  onHighlightParagraph,
  onFeedback,
  onRequestUnlock,
}: TutorMessageListProps) {
  const [confirmUnlockQ, setConfirmUnlockQ] = useState<number | null>(null);

  return (
    <div className="space-y-3.5">
      {messages.map((msg) =>
        msg.role === "user" ? (
          <div key={msg.id} className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-xs bg-[#932120] text-white px-3.5 py-2.5 text-[13px] leading-relaxed shadow-xs">
              {msg.target_question_no ? (
                <div className="text-[10px] font-bold uppercase tracking-wider text-rose-100 mb-0.5">
                  Q{msg.target_question_no} {msg.group_label ? `· ${msg.group_label}` : ""}
                </div>
              ) : null}
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ) : (
          <div key={msg.id} className="flex items-start gap-2">
            <div className="w-7 h-7 rounded-full bg-sky-50 border border-sky-200 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-600" />
            </div>
            <div className="flex-1 min-w-0 rounded-2xl rounded-tl-xs bg-white border border-zinc-200 px-3.5 py-2.5 shadow-2xs">
              {msg.unlocked && (
                <div className="inline-flex items-center gap-1 px-2 py-0.5 mb-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                  <LockOpen className="w-3 h-3" />
                  {language === "en" ? "Answer Unlocked" : "Đã mở khóa đáp án"}
                </div>
              )}
              <TutorFormattedText
                text={msg.content}
                enableHighlight={enableReadingHighlight}
                onHighlight={onHighlightParagraph}
              />
              <div className="mt-2 pt-1.5 border-t border-zinc-100 flex items-center justify-between gap-2 text-[10px] text-zinc-400">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  {msg.cached ? "Cache" : msg.model || "AI Tutor"}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onFeedback(msg.id, "up")}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${msg.feedback === "up" ? "bg-emerald-50 text-emerald-600" : "hover:bg-zinc-100 text-zinc-400"}`}
                    title="Hữu ích"
                  >
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onFeedback(msg.id, "down")}
                    className={`p-1 rounded-md transition-colors cursor-pointer ${msg.feedback === "down" ? "bg-rose-50 text-rose-600" : "hover:bg-zinc-100 text-zinc-400"}`}
                    title="Chưa rõ"
                  >
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {isStreaming && (
        <div className="flex items-start gap-2">
          <RobotMascotLottie size={28} speed={mascotSpeed} enabled={mascotEnabled} />
          <div className="flex-1 min-w-0 rounded-2xl rounded-tl-xs bg-white border border-sky-200 px-3.5 py-2.5 shadow-2xs">
            {streamingText ? (
              <TutorFormattedText
                text={streamingText}
                enableHighlight={enableReadingHighlight}
                onHighlight={onHighlightParagraph}
              />
            ) : (
              <div className="flex items-center gap-1.5 py-1 text-xs text-sky-700 font-medium">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:120ms]" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:240ms]" />
                <span className="ml-1">{language === "en" ? "Analyzing context..." : "Đang phân tích ngữ cảnh đề..."}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {allowUnlock && selectedQuestionNo && !isStreaming && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5">
          {confirmUnlockQ === selectedQuestionNo ? (
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-amber-900">
                {language === "en" ? `Reveal answer for Q${selectedQuestionNo}?` : `Xác nhận xem đáp án câu ${selectedQuestionNo}?`}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={() => setConfirmUnlockQ(null)} className="px-2 py-1 rounded-md border border-amber-300 text-amber-800 font-semibold hover:bg-amber-100 cursor-pointer">
                  {language === "en" ? "Cancel" : "Hủy"}
                </button>
                <button type="button" onClick={() => { const q = selectedQuestionNo; setConfirmUnlockQ(null); onRequestUnlock(q); }} className="px-2.5 py-1 rounded-md bg-amber-600 text-white font-bold hover:bg-amber-700 cursor-pointer">
                  {language === "en" ? "Unlock" : "Mở khóa"}
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmUnlockQ(selectedQuestionNo)} className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-amber-800 hover:text-amber-950 cursor-pointer">
              <LockOpen className="w-3.5 h-3.5" />
              {language === "en" ? `Unlock answer & explanation for Q${selectedQuestionNo}` : `Mở khóa đáp án & giải thích câu ${selectedQuestionNo}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
