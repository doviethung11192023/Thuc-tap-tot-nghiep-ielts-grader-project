"use client";

import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { SpeakingPromptDisplay } from './speaking-prompt-card';
import { SpeakingDetailAudioPlayer } from './speaking-detail-audio-player';
import { SpeakingAnswerFeedback } from './speaking-answer-feedback';
import {
  formatMs,
  QUESTION_METRIC_META,
  type PartFeedbackAnswer,
  type SpeakingAnswerDetail,
} from './speaking-detail-types';

interface SpeakingDetailQuestionCardProps {
  answer: SpeakingAnswerDetail;
  index: number;
  feedback?: PartFeedbackAnswer;
  expandUpgradesSignal?: boolean;
  onRegisterAudio: (responseId: string, el: HTMLAudioElement | null) => void;
  onSeekPin: (responseId: string, startMs?: number | null) => void;
}

export function SpeakingDetailQuestionCard({
  answer,
  index,
  feedback,
  expandUpgradesSignal = false,
  onRegisterAudio,
  onSeekPin,
}: SpeakingDetailQuestionCardProps) {
  const [showUpgrade, setShowUpgrade] = useState(expandUpgradesSignal);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setShowUpgrade(expandUpgradesSignal);
  }, [expandUpgradesSignal]);

  const pins = answer.annotations ?? [];
  // Spec 007: bài chấm từ bản này có lỗi gạch chân, điểm mạnh, từ phát âm chưa rõ; bài cũ chỉ có transcript
  const hasDetailedFeedback = Boolean(
    answer.edits?.length || answer.strengths?.length || answer.pronunciation_hints?.length
  );
  const metrics = answer.metrics ?? {};
  const availableMetrics = QUESTION_METRIC_META.filter((m) => metrics[m.key] !== undefined);

  const handleCopyUpgrade = async () => {
    if (!feedback?.upgraded_answer) return;
    try {
      await navigator.clipboard.writeText(feedback.upgraded_answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard unavailable in insecure context; ignore silently
    }
  };

  return (
    <article
      id={`speaking-q-${answer.response_id}`}
      className="scroll-mt-24 bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4"
    >
      {/* Question Header */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 text-[11px] font-extrabold">
              Part {answer.part} • Câu {index + 1}
            </span>
            {pins.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold">
                <MapPin className="w-3 h-3" />
                {pins.length} mốc góp ý Chuyên gia
              </span>
            )}
          </div>
          {answer.duration_ms != null && answer.duration_ms > 0 && (
            <span className="text-xs font-mono text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatMs(answer.duration_ms)}
            </span>
          )}
        </div>
        <SpeakingPromptDisplay part={answer.part} prompt={answer.question} />
      </div>

      {/* Audio Player */}
      {answer.audio_url ? (
        <SpeakingDetailAudioPlayer
          src={answer.audio_url}
          durationMs={answer.duration_ms}
          pins={pins}
          onRegisterAudio={(el) => onRegisterAudio(answer.response_id, el)}
          onPinClick={(startMs) => onSeekPin(answer.response_id, startMs)}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500">
          Audio không còn được lưu cho câu trả lời này.
        </div>
      )}

      {/* Per-question Speech Metrics Strip */}
      {availableMetrics.length > 0 && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {availableMetrics.map((m) => (
            <div key={m.key} className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2">
              <dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {m.label}
              </dt>
              <dd className="text-sm font-black text-slate-800 tabular-nums mt-0.5">
                {m.format(metrics[m.key])}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {/* 2-Column Comparison: Transcript & Pins (Left) | AI/Expert Analysis & Upgrade (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pt-1">
        {/* Left: Transcript + Expert Timestamp Pins */}
        <div className="space-y-3">
          <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                Bản ghi lời nói (Transcript)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {feedback?.relevance && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700">
                    Liên quan: {feedback.relevance}
                  </span>
                )}
                {feedback?.development && (
                  <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-700">
                    Triển khai: {feedback.development}
                  </span>
                )}
              </div>
            </div>
            {hasDetailedFeedback ? (
              <SpeakingAnswerFeedback
                transcript={answer.transcript}
                audioUrl={answer.audio_url}
                edits={answer.edits ?? []}
                strengths={answer.strengths ?? []}
                hints={answer.pronunciation_hints ?? []}
              />
            ) : (
              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                {answer.transcript || 'Không nghe được câu trả lời.'}
              </p>
            )}
          </div>

          {pins.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Góp ý theo mốc thời gian ({pins.length})
              </p>
              <div className="space-y-1.5">
                {pins.map((pin) => (
                  <div
                    key={pin.id}
                    className="p-2.5 rounded-xl bg-rose-50/60 border border-rose-200 text-xs space-y-1"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onSeekPin(answer.response_id, pin.start_ms)}
                        disabled={!answer.audio_url}
                        className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-rose-100 text-rose-800 hover:bg-rose-200 disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                        title="Nghe từ mốc thời gian này"
                      >
                        <Clock className="w-3 h-3" />
                        {formatMs(pin.start_ms)}
                      </button>
                      <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-white text-slate-800 border border-slate-200">
                        {pin.category}
                      </span>
                      {pin.corrected_text && (
                        <span className="font-bold text-emerald-800">{pin.corrected_text}</span>
                      )}
                    </div>
                    <p className="text-slate-700 leading-relaxed">{pin.explanation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: Structured Feedback & Band 8+ Upgrade */}
        <div className="space-y-3">
          {feedback ? (
            <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 space-y-3">
              {feedback.strengths && feedback.strengths.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Điểm tốt
                  </p>
                  <ul className="space-y-1 text-xs text-slate-700">
                    {feedback.strengths.map((item, idx) => (
                      <li key={`${item.point}-${idx}`} className="leading-relaxed">
                        <span className="font-semibold text-slate-800">{item.point}</span>{' '}
                        {item.evidence && <em className="text-slate-500">“{item.evidence}”</em>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.issues && feedback.issues.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Cần cải thiện
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {feedback.issues.map((item, idx) => (
                      <li
                        key={`${item.point}-${idx}`}
                        className="rounded-lg bg-amber-50/60 border border-amber-200/70 px-2.5 py-2 leading-relaxed"
                      >
                        <span className="font-semibold text-amber-950">{item.point}</span>
                        {item.recommendation && (
                          <span className="block text-slate-700 mt-0.5">{item.recommendation}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {!!feedback.useful_language?.length && (
                <div className="space-y-1.5">
                  <p className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                    Cụm từ nên dùng
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {feedback.useful_language.map((phrase, idx) => (
                      <span
                        key={`${phrase}-${idx}`}
                        className="px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200/80 text-indigo-800 text-[11px] font-medium"
                      >
                        {phrase}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {feedback.upgraded_answer && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2">
                    <button
                      type="button"
                      onClick={() => setShowUpgrade((prev) => !prev)}
                      className="flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-800 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Câu trả lời nâng cấp</span>
                      {showUpgrade ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                    {showUpgrade && (
                      <button
                        type="button"
                        onClick={handleCopyUpgrade}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-blue-200 text-[11px] font-semibold text-blue-700 hover:bg-blue-100/70 cursor-pointer"
                      >
                        {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                      </button>
                    )}
                  </div>
                  {showUpgrade && (
                    <p className="px-3 pb-3 text-xs sm:text-[13px] text-slate-800 leading-relaxed border-t border-blue-100 pt-2">
                      {feedback.upgraded_answer}
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-xs text-slate-500">
              Chưa có phân tích chi tiết riêng cho câu hỏi này.
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
