"use client";

import React from "react";
import { Coins, Cpu, Gauge, ShieldCheck } from "lucide-react";
import type { AdminTutorStats } from "@/services/admin-tutor";
import { AdminAiTutorTraceTable } from "@/components/admin/ai-tutor/AdminAiTutorTraceTable";

interface Props {
  stats: AdminTutorStats;
  onRefresh: () => void;
}

const CONTEXT_BARS = [
  { key: "passage", label: "Passage / Transcript", color: "bg-sky-500" },
  { key: "questions", label: "Câu hỏi & Grounding Key", color: "bg-amber-500" },
  { key: "system", label: "Luật Sư phạm Socratic", color: "bg-[#932120]" },
  { key: "history", label: "Lịch sử hội thoại", color: "bg-emerald-500" },
  { key: "query", label: "Câu hỏi học viên", color: "bg-zinc-500" },
] as const;

export function AdminAiTutorTelemetrySection({ stats, onRefresh }: Props) {
  const tel = stats.telemetry;
  if (!tel) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center text-xs font-semibold text-zinc-500">
        Chưa có dữ liệu Telemetry từ Backend. Hãy bấm Làm mới sau lượt chat đầu tiên.
      </div>
    );
  }

  const cards = [
    { label: "Tổng Token Hôm nay", val: tel.total_tokens_today.toLocaleString("vi-VN"), sub: `In: ${tel.prompt_tokens_today.toLocaleString("vi-VN")} · Out: ${tel.completion_tokens_today.toLocaleString("vi-VN")} · TB: ${tel.avg_tokens_per_turn}/lượt`, icon: Cpu, tone: "bg-sky-50 text-sky-700" },
    { label: "FinOps & Tiết kiệm Cache", val: `$${tel.estimated_cost_usd_today.toFixed(4)}`, sub: `Tiết kiệm: +${tel.cached_tokens_saved_today.toLocaleString("vi-VN")} tok ($${tel.cost_saved_usd_today.toFixed(4)})`, icon: Coins, tone: "bg-emerald-50 text-emerald-700" },
    { label: "Hiệu năng Stream LLM", val: `${tel.avg_ttft_ms}ms TTFT`, sub: `Tổng TB: ${tel.avg_latency_ms}ms · Max: ${tel.max_latency_ms}ms · ${tel.avg_tokens_per_sec} tok/s`, icon: Gauge, tone: "bg-amber-50 text-amber-700" },
    { label: "CSAT & Guardrail Spoiler", val: tel.csat_pct === null ? "Chưa có vote" : `${tel.csat_pct}% Hữu ích`, sub: `👍 ${tel.thumbs_up_today} / 👎 ${tel.thumbs_down_today} · Chặn: ${tel.redactions_today} · Trunc: ${tel.truncated_turns_today}`, icon: ShieldCheck, tone: tel.thumbs_down_today > tel.thumbs_up_today ? "bg-rose-50 text-rose-700" : "bg-zinc-100 text-zinc-800" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-zinc-200 bg-white p-4 flex items-start gap-3 shadow-2xs">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${c.tone}`}>
              <c.icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-zinc-500">{c.label}</p>
              <p className="text-lg font-black text-zinc-900 tabular-nums">{c.val}</p>
              <p className="text-[10px] font-semibold text-zinc-500 truncate" title={c.sub}>{c.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-zinc-900">Phân rã Ngữ cảnh Input Token &amp; Tầng Sư phạm</h4>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
              Reading: {tel.skill_tokens.reading.toLocaleString("vi-VN")} · Listening: {tel.skill_tokens.listening.toLocaleString("vi-VN")}
            </span>
          </div>
          <div className="space-y-2">
            {CONTEXT_BARS.map((bar) => {
              const pct = tel.context_share_pct[bar.key] || 0;
              return (
                <div key={bar.key} className="space-y-0.5">
                  <div className="flex justify-between text-[11px] font-semibold text-zinc-700">
                    <span>{bar.label}</span>
                    <span className="tabular-nums font-bold">{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                    <div className={`h-full rounded-full ${bar.color}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t border-zinc-100 flex flex-wrap gap-2 text-[11px] font-bold">
            <span className="px-2 py-1 rounded-lg bg-sky-50 text-sky-800">T1 Định vị: {tel.tier_turns.tier1}</span>
            <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-800">T2 Phân tích bẫy: {tel.tier_turns.tier2}</span>
            <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800">T3 Chấm nháp: {tel.tier_turns.tier3}</span>
            <span className="px-2 py-1 rounded-lg bg-rose-50 text-rose-800">Unlock: {tel.tier_turns.unlock}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
          <h4 className="text-xs font-black text-zinc-900">Phân bổ Token &amp; Chi phí FinOps theo Model</h4>
          {tel.models_breakdown.length === 0 ? (
            <p className="text-xs text-zinc-400 py-8 text-center">Chưa phát sinh lượt gọi LLM nào hôm nay.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] font-bold uppercase text-zinc-500">
                    <th className="py-1.5 pr-2">Provider / Model</th>
                    <th className="py-1.5 px-2 text-right">Lượt</th>
                    <th className="py-1.5 px-2 text-right">Input</th>
                    <th className="py-1.5 px-2 text-right">Output</th>
                    <th className="py-1.5 pl-2 text-right">Chi phí</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {tel.models_breakdown.map((m) => (
                    <tr key={m.provider_model} className="text-[11px]">
                      <td className="py-2 pr-2 font-mono font-bold text-zinc-900">{m.provider_model}</td>
                      <td className="py-2 px-2 text-right tabular-nums">{m.turns}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-zinc-600">{m.prompt_tokens.toLocaleString("vi-VN")}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-zinc-600">{m.completion_tokens.toLocaleString("vi-VN")}</td>
                      <td className="py-2 pl-2 text-right tabular-nums font-bold text-emerald-700">${m.cost_usd.toFixed(5)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <AdminAiTutorTraceTable traces={tel.recent_traces || []} onRefresh={onRefresh} />
    </div>
  );
}
