"use client";

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronsUpDown } from 'lucide-react';
import { getAttemptDetail } from '@/services/student-test-practice';
import {
  matchPartFeedbackAnswer,
  type SpeakingDetail,
} from './speaking/speaking-detail-types';
import { SpeakingDetailSidebar } from './speaking/speaking-detail-sidebar';
import { SpeakingDetailQuestionCard } from './speaking/speaking-detail-question-card';

interface SpeakingResultsViewProps {
  attemptId?: string;
  backUrl: string;
}

export const SpeakingResultsView: React.FC<SpeakingResultsViewProps> = ({ attemptId, backUrl }) => {
  const [detail, setDetail] = useState<SpeakingDetail | null>(null);
  const [failed, setFailed] = useState(!attemptId);
  const [activePart, setActivePart] = useState<number | 'all'>('all');
  const [expandAllUpgrades, setExpandAllUpgrades] = useState(false);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  useEffect(() => {
    if (!attemptId) return;
    getAttemptDetail(attemptId).then(setDetail).catch(() => setFailed(true));
  }, [attemptId]);

  const partNumbers = [...new Set(detail?.answers.map((answer) => answer.part) ?? [])];
  const visibleParts = activePart === 'all' ? partNumbers : partNumbers.filter((p) => p === activePart);

  const handleRegisterAudio = (responseId: string, el: HTMLAudioElement | null) => {
    audioRefs.current[responseId] = el;
  };

  const handleSeekPin = (responseId: string, startMs?: number | null) => {
    const audio = audioRefs.current[responseId];
    if (!audio) return;
    audio.currentTime = Math.max(0, (startMs || 0) / 1000);
    void audio.play().catch(() => {});
  };

  const handleJumpToQuestion = (part: number, responseId: string) => {
    if (activePart !== 'all' && activePart !== part) {
      setActivePart('all');
      setTimeout(() => {
        document.getElementById(`speaking-q-${responseId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
      return;
    }
    document.getElementById(`speaking-q-${responseId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-50 scroll-smooth pb-16">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href={backUrl}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer shrink-0"
              title="Quay lại"
              aria-label="Quay lại trang tổng kết"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Chi tiết bài thi Speaking
              </p>
              <h1 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {detail?.title ?? 'Chi tiết bài làm'}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {detail?.overall_band != null && (
              <span className="hidden sm:inline-flex items-center px-3 py-1 rounded-full bg-[#932120] text-white text-xs font-extrabold tabular-nums">
                Band {detail.overall_band.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {failed && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 mt-8">
            <p className="text-sm font-bold text-slate-700">Không tải được chi tiết bài làm.</p>
            <Link href={backUrl} className="inline-block text-xs font-bold text-[#932120] hover:underline">
              Quay lại trang kết quả
            </Link>
          </div>
        )}

        {detail?.speaking?.pronunciation?.phoneme_usable === false && (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2 mb-4">
            Bản ghi có vẻ bị méo hoặc phát qua loa, nên hệ thống không chỉ ra từ phát âm chưa rõ. Hãy ghi âm trực tiếp, gần micro để nhận gợi ý từng từ.
          </p>
        )}

        {!failed && !detail && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-pulse">
            <div className="lg:col-span-4 space-y-4">
              <div className="h-56 rounded-2xl bg-slate-200/70" />
              <div className="h-64 rounded-2xl bg-slate-200/70" />
            </div>
            <div className="lg:col-span-8 space-y-4">
              <div className="h-12 rounded-2xl bg-slate-200/70" />
              <div className="h-64 rounded-2xl bg-slate-200/70" />
              <div className="h-64 rounded-2xl bg-slate-200/70" />
            </div>
          </div>
        )}

        {detail && partNumbers.length === 0 && (
          <div className="max-w-lg mx-auto bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 mt-8">
            <p className="text-sm font-bold text-slate-800">
              Chưa có câu trả lời Speaking nào được lưu cho lượt này.
            </p>
            <Link href={backUrl} className="inline-block text-xs font-bold text-[#932120] hover:underline">
              Quay lại trang kết quả
            </Link>
          </div>
        )}

        {detail && partNumbers.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-4 lg:sticky lg:top-20">
              <SpeakingDetailSidebar
                detail={detail}
                activePart={activePart}
                onJumpToQuestion={handleJumpToQuestion}
              />
            </div>

            <div className="lg:col-span-8 space-y-6">
              {/* Toolbar: Part Filter + Expand Upgrades */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white rounded-2xl border border-slate-200/90 px-4 py-3 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePart('all')}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                      activePart === 'all'
                        ? 'bg-[#932120] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({detail.answers.length} câu)
                  </button>
                  {partNumbers.map((part) => (
                    <button
                      key={part}
                      type="button"
                      onClick={() => setActivePart(part)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        activePart === part
                          ? 'bg-[#932120] text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Part {part}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setExpandAllUpgrades((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  <ChevronsUpDown className="w-3.5 h-3.5" />
                  <span>{expandAllUpgrades ? 'Thu gọn câu nâng cấp' : 'Mở tất cả câu nâng cấp'}</span>
                </button>
              </div>

              {visibleParts.map((part) => {
                const partFeedback = detail.parts?.[`part${part}`];
                const answers = detail.answers.filter((answer) => answer.part === part);
                return (
                  <section key={part} className="space-y-4">
                    <div className="rounded-2xl bg-white border border-slate-200/90 p-4 space-y-1.5 shadow-2xs">
                      <h2 className="text-base font-extrabold text-slate-900">Part {part}</h2>
                      {partFeedback?.part_summary && (
                        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                          {partFeedback.part_summary}
                        </p>
                      )}
                    </div>

                    <div className="space-y-4">
                      {answers.map((answer, index) => (
                        <SpeakingDetailQuestionCard
                          key={answer.response_id}
                          answer={answer}
                          index={index}
                          feedback={matchPartFeedbackAnswer(partFeedback, answer.question, index)}
                          expandUpgradesSignal={expandAllUpgrades}
                          onRegisterAudio={handleRegisterAudio}
                          onSeekPin={handleSeekPin}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
