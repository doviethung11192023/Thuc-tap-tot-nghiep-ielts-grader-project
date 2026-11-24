"use client";

import React, { useState } from "react";
import { CalendarRange, TrendingUp, TrendingDown, Info, BarChart3 } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import type { MonthlyProgressionPoint, MonthlyScorecard } from "@/types/learning-profile";

interface MonthlyProgressSectionProps {
  progression?: MonthlyProgressionPoint[];
  scorecard?: MonthlyScorecard;
}

const SKILL_FILTERS = [
  { key: "overall_band", label: "Overall" },
  { key: "listening", label: "Listening" },
  { key: "reading", label: "Reading" },
  { key: "writing", label: "Writing" },
  { key: "speaking", label: "Speaking" },
] as const;

export function MonthlyProgressSection({ progression = [], scorecard }: MonthlyProgressSectionProps) {
  const [selectedMetric, setSelectedMetric] = useState<string>("overall_band");
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");

  if (!progression.length && !scorecard) return null;

  const deltaPill = (val: number | null | undefined, suffix = "") => {
    if (val === null || val === undefined) return <span className="text-[11px] text-zinc-400 font-semibold">Tháng đầu</span>;
    if (val > 0) return <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full"><TrendingUp className="w-3 h-3" /> +{val}{suffix}</span>;
    if (val < 0) return <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full"><TrendingDown className="w-3 h-3" /> {val}{suffix}</span>;
    return <span className="text-[11px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full">0{suffix} ổn định</span>;
  };

  return (
    <section className="bg-white rounded-3xl border border-zinc-200/90 p-5 sm:p-6 shadow-2xs space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-zinc-900 tracking-tight">
              Theo Dõi Trình Độ Thay Đổi Hàng Tháng
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Biểu đồ tăng trưởng band điểm & khối lượng luyện đề theo từng tháng (giờ Việt Nam)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button type="button" onClick={() => setViewMode("chart")} className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${viewMode === "chart" ? "bg-white text-[#932120] shadow-2xs" : "text-zinc-600"}`}>Biểu đồ</button>
            <button type="button" onClick={() => setViewMode("table")} className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${viewMode === "table" ? "bg-white text-[#932120] shadow-2xs" : "text-zinc-600"}`}>Bảng tháng</button>
          </div>
        </div>
      </div>

      {scorecard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>Band {scorecard.current_label}</span>
              {deltaPill(scorecard.band_delta)}
            </div>
            <div className="text-2xl font-black text-zinc-900">{scorecard.overall_band > 0 ? scorecard.overall_band.toFixed(1) : "--"}</div>
            <p className="text-[11px] text-zinc-500">Mục tiêu: {scorecard.target_band.toFixed(1)} {scorecard.is_provisional && "• Tạm tính"}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>Chính xác L/R</span>
              {deltaPill(scorecard.accuracy_delta, "%")}
            </div>
            <div className="text-2xl font-black text-blue-600">{scorecard.lr_accuracy !== null ? `${scorecard.lr_accuracy}%` : "--"}</div>
            <p className="text-[11px] text-zinc-500">Chỉ số quá trình câu trả lời đúng</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>Bài đã nộp trong tháng</span>
              {deltaPill(scorecard.tests_delta, " bài")}
            </div>
            <div className="text-2xl font-black text-zinc-900">{scorecard.total_tests}</div>
            <p className="text-[11px] text-zinc-500">Tiến bộ nổi bật: {scorecard.best_skill}</p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold">
              <span>Thời lượng luyện</span>
              <BarChart3 className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-emerald-700">{scorecard.study_hours}h</div>
            <p className="text-[11px] text-zinc-500">Tổng giờ tập trung thực tế</p>
          </div>
        </div>
      )}

      {scorecard?.insight && (
        <div className={`flex items-start gap-2.5 rounded-2xl border px-4 py-3 text-xs font-medium ${
          scorecard.is_provisional ? "bg-amber-50/80 border-amber-200 text-amber-900" : "bg-blue-50/70 border-blue-200 text-blue-950"
        }`}>
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Phân tích tháng {scorecard.current_label}:</strong> {scorecard.insight}</span>
        </div>
      )}

      {viewMode === "chart" ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {SKILL_FILTERS.map((sf) => (
                <button
                  key={sf.key}
                  type="button"
                  onClick={() => setSelectedMetric(sf.key)}
                  className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors cursor-pointer ${
                    selectedMetric === sf.key ? "bg-[#932120] text-white border-[#932120]" : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {sf.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold text-zinc-500">
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 bg-[#932120] rounded-full" /> Band điểm</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-zinc-300 rounded-xs" /> Bài đã nộp</span>
              <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-0.5 border-t-2 border-dashed border-emerald-600" /> Mục tiêu</span>
            </div>
          </div>

          <div className="h-72 w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={progression} margin={{ top: 14, right: 16, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#71717a", fontWeight: 600 }} />
                <YAxis yAxisId="band" domain={[0, 9]} ticks={[0, 3, 4.5, 6, 7.5, 9]} tick={{ fontSize: 11, fill: "#71717a" }} />
                <YAxis yAxisId="cnt" orientation="right" hide domain={[0, (dataMax: number) => Math.max(Math.ceil((dataMax || 0) * 1.6), 6)]} />
                <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #e4e4e7", fontSize: "12px" }} />
                {scorecard?.target_band && (
                  <ReferenceLine yAxisId="band" y={scorecard.target_band} stroke="#10b981" strokeDasharray="4 4" label={{ value: `Mục tiêu ${scorecard.target_band}`, fill: "#047857", fontSize: 11, position: "insideTopRight" }} />
                )}
                <Bar yAxisId="cnt" dataKey="total_tests" name="Bài đã nộp" fill="#e4e4e7" radius={[6, 6, 0, 0]} barSize={22} />
                <Line yAxisId="band" type="monotone" dataKey={selectedMetric} name="Band điểm" stroke="#932120" strokeWidth={3} connectNulls dot={{ r: 4, fill: "#932120", stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-zinc-600">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-700 font-bold uppercase text-[11px]">
              <tr>
                <th className="px-3 py-2.5">Tháng</th>
                <th className="px-3 py-2.5">Overall</th>
                <th className="px-3 py-2.5">L / R / W / S</th>
                <th className="px-3 py-2.5">Mock / Practice</th>
                <th className="px-3 py-2.5">Giờ học</th>
                <th className="px-3 py-2.5">Biến động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {progression.slice().reverse().map((row) => (
                <tr key={row.month} className="hover:bg-zinc-50/70">
                  <td className="px-3 py-2.5 font-bold text-zinc-900">{row.label} {row.is_provisional && <span className="text-[10px] text-amber-700">(Tạm tính)</span>}</td>
                  <td className="px-3 py-2.5 font-black text-[#932120]">{row.overall_band?.toFixed(1) ?? "--"}</td>
                  <td className="px-3 py-2.5 font-mono">{[row.listening, row.reading, row.writing, row.speaking].map((v) => v?.toFixed(1) ?? "-").join(" / ")}</td>
                  <td className="px-3 py-2.5">{row.mock_count} Mock • {row.practice_count} Practice</td>
                  <td className="px-3 py-2.5">{row.study_hours}h</td>
                  <td className="px-3 py-2.5">{deltaPill(row.month_over_month_delta)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
