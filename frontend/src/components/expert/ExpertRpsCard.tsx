"use client";

import React from "react";
import { AlertTriangle, Award, CheckCircle2, Circle, ShieldCheck, ThumbsUp } from "lucide-react";
import type { ExpertPerformanceDetail, ExpertRpsSummary } from "@/types";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { BorderBeam, SpotlightCard } from "@/components/motion";

const TIER_META: Record<
  string,
  { label: string; badge: string; tone: "amber" | "crimson" | "emerald" }
> = {
  top_expert: {
    label: "Top Expert — Ưu tiên hàng đầu Mock",
    badge: "bg-red-50 text-[#932120] border-red-300",
    tone: "crimson",
  },
  high_performer: {
    label: "High Performer — Ưu tiên Mock",
    badge: "bg-amber-50 text-amber-800 border-amber-300",
    tone: "amber",
  },
  standard: {
    label: "Standard — Điều phối tiêu chuẩn",
    badge: "bg-zinc-100 text-zinc-700 border-zinc-300",
    tone: "emerald",
  },
  probation: {
    label: "Probation — Cần cải thiện SLA",
    badge: "bg-rose-50 text-rose-800 border-rose-300",
    tone: "crimson",
  },
};

function fmtRate(v?: number | null, suffix = "%"): string {
  return v !== undefined && v !== null ? `${v.toFixed(1)}${suffix}` : "—";
}

export function ExpertRpsCard({
  rps,
  performance,
}: {
  rps?: ExpertRpsSummary | null;
  performance?: ExpertPerformanceDetail | null;
}) {
  const data = performance || rps;
  if (!data) return null;

  const tier = String(data.tier || "standard");
  const meta = TIER_META[tier] || TIER_META.standard;
  const activePenalties = data.active_penalties || [];
  const nextReqs = data.next_tier_requirements || [];

  return (
    <SpotlightCard
      tone={meta.tone}
      className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4 overflow-hidden"
    >
      {tier === "top_expert" && <BorderBeam tone="crimson-amber" duration={9} />}

      <div className="flex items-center justify-between gap-2 relative z-10">
        <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-[#932120]" />
          Hiệu suất 30 ngày &amp; Hạng
        </h3>
        <span className="text-base font-black font-mono tabular-nums text-[#932120]">
          <AnimatedNumber value={data.completed_count ?? data.completed_30d ?? 0} decimals={0} /> bài
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 relative z-10">
        <span className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold inline-flex items-center gap-1 ${meta.badge}`}>
          <Award className="w-3.5 h-3.5" />
          {meta.label}
        </span>
        {typeof data.tier_max_reviews === "number" && (
          <span className="text-[11px] font-mono font-bold text-zinc-500 tabular-nums">
            Trần tối đa: {data.tier_max_reviews} bài
          </span>
        )}
      </div>

      {/* 6 Chỉ số vận hành trực tiếp (BR-22) */}
      <div className="grid grid-cols-2 gap-2.5 pt-1 text-[11px] relative z-10">
        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
          <span className="text-zinc-500 block">Đúng hạn SLA</span>
          <strong className="text-sm font-mono tabular-nums text-zinc-900">{fmtRate(data.on_time_rate)}</strong>
        </div>
        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
          <span className="text-zinc-500 block">Chấm sớm (&le;24h)</span>
          <strong className="text-sm font-mono tabular-nums text-zinc-900">{fmtRate(data.early_sla_rate)}</strong>
        </div>
        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
          <span className="text-zinc-500 block">Đạt lần đầu</span>
          <strong className="text-sm font-mono tabular-nums text-zinc-900">
            {fmtRate(data.completeness_first_pass_rate)}
          </strong>
        </div>
        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
          <span className="text-zinc-500 block">TB xử lý</span>
          <strong className="text-sm font-mono tabular-nums text-zinc-900">
            {data.avg_turnaround_hours != null ? `${data.avg_turnaround_hours}h` : "—"}
          </strong>
        </div>
        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
          <span className="text-zinc-500 block">Tỷ lệ từ chối</span>
          <strong className="text-sm font-mono tabular-nums text-zinc-900">{fmtRate(data.decline_rate ?? 0)}</strong>
        </div>
        <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100">
          <span className="text-zinc-500 block">Hữu ích (Học viên)</span>
          <strong className="text-sm font-mono tabular-nums text-zinc-900 inline-flex items-center gap-1">
            <ThumbsUp className="w-3 h-3 text-emerald-700" />
            {data.helpfulness_rate != null ? `${data.helpfulness_rate}%` : "Chưa đủ 5"}
          </strong>
        </div>
      </div>

      {/* Checklist lên hạng kế tiếp */}
      {nextReqs.length > 0 && (
        <div className="pt-2 border-t border-zinc-100 space-y-1.5 relative z-10">
          <p className="text-[11px] font-bold text-zinc-700">Mục tiêu thăng hạng tiếp theo:</p>
          {nextReqs.map((req) => (
            <div key={req.label} className="flex items-center justify-between gap-2 text-[11px]">
              <span className={`flex items-center gap-1.5 ${req.ok ? "text-emerald-800" : "text-zinc-600"}`}>
                {req.ok ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
                )}
                {req.label}
              </span>
              <span className="font-mono tabular-nums font-bold text-zinc-800 shrink-0">{req.current}</span>
            </div>
          ))}
        </div>
      )}

      {/* Danh sách vi phạm đang hiệu lực */}
      {activePenalties.length > 0 && (
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-rose-800">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            Ghi nhận vi phạm 30 ngày ({activePenalties.length})
          </div>
          {activePenalties.slice(0, 3).map((pen) => (
            <div
              key={pen.id}
              className="p-2 rounded-xl bg-rose-50 border border-rose-200 text-[11px] text-rose-900 space-y-0.5"
            >
              <div className="flex items-center justify-between font-bold">
                <span className="uppercase">{pen.severity} · {pen.reason}</span>
                <span className="font-mono text-[10px] text-rose-700">
                  {new Date(pen.created_at).toLocaleDateString("vi-VN")}
                </span>
              </div>
              {pen.note && <p className="text-rose-800">{pen.note}</p>}
            </div>
          ))}
        </div>
      )}
    </SpotlightCard>
  );
}
