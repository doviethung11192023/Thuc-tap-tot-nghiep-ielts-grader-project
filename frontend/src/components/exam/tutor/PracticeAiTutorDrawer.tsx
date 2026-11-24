"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Send, Square, AlertCircle } from "lucide-react";
import { TutorAuthNoticeDrawer } from "./TutorAuthNoticeDrawer";
import { TutorDrawerHeader } from "./TutorDrawerHeader";
import { TutorHintTierBar } from "./TutorHintTierBar";
import { TutorMascotLauncher } from "./TutorMascotLauncher";
import { TutorMessageList } from "./TutorMessageList";
import { TutorWelcomeChips } from "./TutorWelcomeChips";
import { useDraggablePosition } from "./useDraggablePosition";
import { usePracticeTutorSession } from "./usePracticeTutorSession";

interface PracticeAiTutorDrawerProps {
  attemptId?: string | null;
  attemptError?: string | null;
  skill: "listening" | "reading";
  mode: "exam" | "practice";
  activeSectionNo: number;
  userAnswers: Record<number, string | string[]>;
  onHighlightParagraph?: (paragraph: string) => void;
}

const POPUP_W = 392;
const POPUP_H = 580;

export function PracticeAiTutorDrawer({
  attemptId,
  attemptError,
  skill,
  mode,
  activeSectionNo,
  userAnswers,
  onHighlightParagraph,
}: PracticeAiTutorDrawerProps) {
  const [open, setOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const tutor = usePracticeTutorSession({ attemptId, attemptError, mode, activeSectionNo, userAnswers });
  const getDefaultPopupPos = useCallback((vw: number, vh: number) => ({ x: vw - POPUP_W - 20, y: Math.max(72, vh - POPUP_H - 20) }), []);
  const popupDrag = useDraggablePosition({
    storageKey: "moonbot_popup_pos_v1",
    width: POPUP_W,
    height: POPUP_H,
    margin: 12,
    getDefaultPos: getDefaultPopupPos,
  });

  useEffect(() => {
    if (open && scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [open, tutor.session?.messages.length, tutor.streamingText]);

  if (mode !== "practice" || tutor.disabledByAdmin) return null;

  if (!attemptId || !tutor.session) {
    if (!tutor.fallbackState && !attemptError) return null;
    return (
      <TutorAuthNoticeDrawer
        open={open}
        skill={skill}
        reason={tutor.fallbackState?.reason || "auth"}
        detail={tutor.fallbackState?.detail || attemptError}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const cfg = tutor.session.config;
  const chips = tutor.language === "en" ? cfg.quick_chips_en : cfg.quick_chips_vi;
  const welcomeText = tutor.language === "en" ? cfg.welcome_message_en : cfg.welcome_message_vi;

  if (!open) {
    return (
      <TutorMascotLauncher
        botName={cfg.bot_name}
        speed={cfg.mascot_speed}
        enabled={cfg.mascot_animation_enabled}
        onOpen={() => setOpen(true)}
      />
    );
  }

  const containerClass = docked
    ? "fixed inset-y-0 right-0 z-50 w-[368px] max-w-[92vw] xl:static xl:z-auto xl:w-[368px] xl:h-full xl:shrink-0 bg-zinc-50 border-l border-zinc-200 flex flex-col shadow-xl xl:shadow-none"
    : `fixed z-50 w-[392px] max-w-[94vw] h-[580px] max-h-[84vh] rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-200/90 flex flex-col shadow-[0_22px_55px_-12px_rgba(15,23,42,0.28)] ring-1 ring-sky-200/50 ${
        popupDrag.dragging ? "select-none ring-2 ring-[#932120]/40" : ""
      }`;

  return (
    <aside
      data-testid="ai-tutor-drawer"
      style={
        !docked && popupDrag.pos
          ? {
              left: 0,
              top: 0,
              transform: `translate3d(${popupDrag.pos.x}px, ${popupDrag.pos.y}px, 0)`,
              willChange: popupDrag.dragging ? "transform" : undefined,
            }
          : !docked
            ? { right: 20, bottom: 20 }
            : undefined
      }
      className={containerClass}
    >
      {!docked && <div className="h-1 w-full bg-gradient-to-r from-[#932120] via-sky-500 to-cyan-400 shrink-0" />}
      <TutorDrawerHeader
        botName={cfg.bot_name} skill={skill} quota={tutor.session.quota} language={tutor.language}
        mascotEnabled={cfg.mascot_animation_enabled} mascotSpeed={cfg.mascot_speed}
        docked={docked} dragging={popupDrag.dragging} dragHandlers={popupDrag.dragHandlers}
        questionGroups={tutor.session.question_groups} selectedGroupId={tutor.selectedGroupId}
        selectedQuestionNo={tutor.selectedQuestionNo} currentQuestionNumbers={tutor.currentGroup?.question_numbers || []}
        onLanguageChange={tutor.setLanguage}
        onGroupChange={(gid) => { tutor.setSelectedGroupId(gid); tutor.setSelectedQuestionNo(null); }}
        onQuestionChange={tutor.setSelectedQuestionNo}
        onToggleDock={() => setDocked((v) => !v)}
        onResetPos={popupDrag.resetPosition}
        onReset={tutor.resetChat}
        onClose={() => setOpen(false)}
      />
      <TutorHintTierBar hintTier={tutor.hintTier} language={tutor.language} onChange={tutor.setHintTier} />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3.5 py-3.5 space-y-4">
        {tutor.session.messages.length === 0 && !tutor.isStreaming && (
          <TutorWelcomeChips botName={cfg.bot_name} welcomeText={welcomeText} chips={chips} mascotEnabled={cfg.mascot_animation_enabled} mascotSpeed={cfg.mascot_speed} onSelectChip={(chip) => tutor.sendMessage(chip, { isQuickChip: true })} />
        )}

        <TutorMessageList
          messages={tutor.session.messages} streamingText={tutor.streamingText} isStreaming={tutor.isStreaming} language={tutor.language}
          enableReadingHighlight={cfg.enable_reading_highlight} allowUnlock={cfg.allow_answer_unlock}
          selectedQuestionNo={tutor.selectedQuestionNo} mascotEnabled={cfg.mascot_animation_enabled} mascotSpeed={cfg.mascot_speed}
          onHighlightParagraph={onHighlightParagraph}
          onFeedback={tutor.submitFeedback}
          onRequestUnlock={(q) => tutor.sendMessage(tutor.language === "en" ? `Unlock official answer and explain Q${q}.` : `Mở khóa đáp án chính thức và giải thích câu ${q}.`, { unlockQ: q })}
        />

        {tutor.errorMsg && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{tutor.errorMsg}</span>
          </div>
        )}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); const t = input; setInput(""); tutor.sendMessage(t); }} className="bg-white border-t border-zinc-200 p-2.5 shrink-0">
        <div className="flex items-end gap-2">
          <textarea rows={1} value={input} maxLength={cfg.max_input_chars} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); const t = input; setInput(""); tutor.sendMessage(t); } }} placeholder={tutor.language === "en" ? "Ask for hints or strategy..." : "Hỏi gợi ý, từ khóa hoặc bẫy..."} className="flex-1 resize-none rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 focus:outline-none focus:border-[#932120] focus:bg-white" />
          {tutor.isStreaming ? (
            <button type="button" onClick={tutor.stopStream} className="p-2 rounded-xl bg-zinc-800 text-white hover:bg-zinc-900 cursor-pointer shrink-0" title="Dừng"><Square className="w-4 h-4" /></button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="p-2 rounded-xl bg-[#932120] text-white hover:bg-[#7a1a19] disabled:opacity-40 cursor-pointer shrink-0" title="Gửi"><Send className="w-4 h-4" /></button>
          )}
        </div>
      </form>
    </aside>
  );
}
