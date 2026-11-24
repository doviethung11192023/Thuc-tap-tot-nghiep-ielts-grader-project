"use client";

import React from "react";
import { Loader2, SearchCheck, Zap, Clock, Compass, CheckCircle2 } from "lucide-react";

export interface LearnerAnalyticsRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  input_band: number;
  predicted_band: number;
  target_band: number;
  confidence_label: string;
  priority_skill: string;
  skill_bands: Record<string, number>;
  total_attempts: number;
  scored_attempts: number;
  waiting_expert_count: number;
  month_tests: number;
  month_mocks: number;
  month_study_hours: number;
  test_date: string;
}

interface LearnerAnalyticsMatrixProps {
  items: LearnerAnalyticsRow[];
  loading: boolean;
  elapsedMs?: number;
  cacheHit?: boolean;
  onOpenAudit: (userId: string) => void;
  onPrefetchAudit: (userId: string) => void;
}

export function LearnerAnalyticsMatrix({
  items,
  loading,
  elapsedMs,
  cacheHit,
  onOpenAudit,
  onPrefetchAudit,
}: LearnerAnalyticsMatrixProps) {
  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="px-4 sm:px-6 pt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Số liệu đồng bộ 1:1 với thuật toán BR-12 / BR-17 bên màn hình Học viên
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px]">
          <Zap className="w-3.5 h-3.5" />
          3-Query Bulk Vectorized {elapsedMs !== undefined ? `• ${elapsedMs}ms ${cacheHit ? "(RAM Cache)" : "(DB)"}` : ""}
        </span>
      </div>

      <div className="overflow-x-auto min-h-[280px] w-full">
        <table className="w-full text-left border-collapse min-w-[920px]">
          <thead>
            <tr className="bg-zinc-50 border-y border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
              <th className="px-5 py-3.5">Học viên</th>
              <th className="px-5 py-3.5">Trình độ (Đầu vào → BR-12 → Mục tiêu)</th>
              <th className="px-5 py-3.5">Ưu tiên BR-17</th>
              <th className="px-5 py-3.5">Tháng hiện tại</th>
              <th className="px-5 py-3.5">Tổng bài & Chờ Expert</th>
              <th className="px-5 py-3.5 text-center">Minh chứng Số liệu</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 text-xs sm:text-sm">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                  Không có học viên nào khớp bộ lọc
                </td>
              </tr>
            ) : (
              items.map((row) => (
                <tr key={row.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-zinc-900">{row.full_name}</div>
                    <div className="text-xs text-zinc-500">{row.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 font-black text-sm">
                      <span className="text-zinc-600">{row.input_band.toFixed(1)}</span>
                      <span className="text-zinc-300">→</span>
                      <span className="text-blue-600">{row.predicted_band.toFixed(1)}</span>
                      <span className="text-zinc-300">→</span>
                      <span className="text-[#932120]">{row.target_band.toFixed(1)}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-0.5">
                      L:{row.skill_bands.listening?.toFixed(1)} • R:{row.skill_bands.reading?.toFixed(1)} • W:{row.skill_bands.writing?.toFixed(1)} • S:{row.skill_bands.speaking?.toFixed(1)}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#932120]/10 text-[#932120] font-black text-xs uppercase">
                      <Compass className="w-3.5 h-3.5" /> {row.priority_skill}
                    </span>
                    <div className="text-[11px] text-zinc-500 mt-1">{row.confidence_label}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-bold text-zinc-900">{row.month_tests} đề ({row.month_mocks} Mock)</div>
                    <div className="text-[11px] text-emerald-700 font-semibold inline-flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" /> {row.month_study_hours}h học
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-zinc-800">{row.scored_attempts} đã chấm / {row.total_attempts} lượt</div>
                    {row.waiting_expert_count > 0 && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold">
                        {row.waiting_expert_count} chờ Expert
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      type="button"
                      onMouseEnter={() => onPrefetchAudit(row.id)}
                      onClick={() => onOpenAudit(row.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <SearchCheck className="w-4 h-4" /> Xem Minh Chứng
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
