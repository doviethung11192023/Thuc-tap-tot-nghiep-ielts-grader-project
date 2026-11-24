"use client";

import React from 'react';
import { Award, CheckCircle2, Clock, MapPin, MessageSquareQuote, Sparkles } from 'lucide-react';
import {
  CRITERION_SHORT_LABELS,
  formatMs,
  type SpeakingAnswerDetail,
  type SpeakingDetail,
} from './speaking-detail-types';

interface SpeakingDetailSidebarProps {
  detail: SpeakingDetail;
  activePart: number | 'all';
  onJumpToQuestion: (part: number, responseId: string) => void;
}

export function SpeakingDetailSidebar({
  detail,
  activePart,
  onJumpToQuestion,
}: SpeakingDetailSidebarProps) {
  const isExpert = detail.evaluator_type === 'expert';
  const criteria = detail.speaking?.criteria ?? [];
  const overallBand = detail.overall_band;
  const expertFeedback = detail.speaking?.feedback;
  const aiSummary = detail.speaking?.overall?.summary;

  const groupedByPart = detail.answers.reduce<Record<number, SpeakingAnswerDetail[]>>((acc, item) => {
    acc[item.part] = acc[item.part] ?? [];
    acc[item.part].push(item);
    return acc;
  }, {});
  const parts = Object.keys(groupedByPart)
    .map(Number)
    .sort((a, b) => a - b);

  return (
    <aside className="space-y-4 lg:sticky lg:top-20">
      {/* Score Overview Card */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                isExpert
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-[#932120]'
              }`}
            >
              {isExpert ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {isExpert ? 'Chuyên gia đã thẩm định' : 'Điểm ước lượng AI'}
            </span>
            <p className="text-xs text-slate-500 font-medium pt-1">Tổng điểm Speaking</p>
          </div>

          <div className="flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-gradient-to-br from-[#932120] to-[#6a1514] text-white shadow-sm min-w-[80px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-100">Band</span>
            <span className="text-3xl font-black leading-none mt-0.5 tabular-nums">
              {overallBand != null ? overallBand.toFixed(1) : '—'}
            </span>
          </div>
        </div>

        {criteria.length > 0 && (
          <div className="grid grid-cols-2 gap-2 pt-1">
            {criteria.map((c) => (
              <div
                key={c.code}
                className="rounded-xl bg-slate-50 border border-slate-200/70 px-3 py-2 flex items-center justify-between gap-2"
                title={c.comment || CRITERION_SHORT_LABELS[c.code] || c.name}
              >
                <div className="min-w-0">
                  <p className="text-[11px] font-extrabold text-slate-700 truncate">{c.code}</p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {CRITERION_SHORT_LABELS[c.code] ?? c.name}
                  </p>
                </div>
                <span className="text-sm font-black text-[#932120] tabular-nums shrink-0">
                  {c.band.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        )}

        {(expertFeedback || aiSummary) && (
          <div className="rounded-xl bg-amber-50/70 border border-amber-200/80 p-3 space-y-1">
            <p className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
              {isExpert ? (
                <Award className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              ) : (
                <MessageSquareQuote className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              )}
              {isExpert ? 'Nhận xét tổng quan từ Chuyên gia' : 'Tóm tắt đánh giá AI'}
            </p>
            <p className="text-xs text-slate-700 leading-relaxed line-clamp-5">
              {expertFeedback || aiSummary}
            </p>
          </div>
        )}
      </section>

      {/* Question Navigator */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
            Mục lục câu hỏi ({detail.answers.length})
          </h2>
          {activePart !== 'all' && (
            <span className="text-[11px] font-semibold text-[#932120]">Đang lọc Part {activePart}</span>
          )}
        </div>

        <div className="space-y-3 max-h-[42vh] overflow-y-auto pr-1">
          {parts.map((part) => (
            <div key={part} className="space-y-1.5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide px-1">
                Part {part}
              </p>
              <div className="space-y-1">
                {groupedByPart[part].map((ans, idx) => {
                  const pinCount = ans.annotations?.length ?? 0;
                  return (
                    <button
                      key={ans.response_id}
                      type="button"
                      onClick={() => onJumpToQuestion(part, ans.response_id)}
                      className="w-full text-left px-2.5 py-2 rounded-xl border border-transparent hover:border-red-200 hover:bg-red-50/70 transition-colors flex items-center justify-between gap-2 group cursor-pointer"
                    >
                      <div className="min-w-0 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-slate-100 group-hover:bg-[#932120] group-hover:text-white text-[11px] font-bold text-slate-700 flex items-center justify-center shrink-0 transition-colors">
                          Q{idx + 1}
                        </span>
                        <span className="text-xs font-medium text-slate-700 truncate">
                          {ans.question}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {pinCount > 0 && (
                          <span
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-700 text-[10px] font-bold"
                            title={`${pinCount} mốc lỗi Chuyên gia`}
                          >
                            <MapPin className="w-2.5 h-2.5" />
                            {pinCount}
                          </span>
                        )}
                        {ans.duration_ms != null && ans.duration_ms > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-500">
                            <Clock className="w-2.5 h-2.5" />
                            {formatMs(ans.duration_ms)}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </aside>
  );
}
