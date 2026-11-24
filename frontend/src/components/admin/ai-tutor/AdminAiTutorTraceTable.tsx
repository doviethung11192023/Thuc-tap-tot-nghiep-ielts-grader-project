"use client";

import React, { useMemo, useState } from "react";
import { Activity, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import type { AdminTutorTraceItem } from "@/services/admin-tutor";

type TraceFilter = "all" | "llm" | "redacted" | "negative";

export function AdminAiTutorTraceTable({ traces, onRefresh }: { traces: AdminTutorTraceItem[]; onRefresh: () => void }) {
  const [filter, setFilter] = useState<TraceFilter>("all");

  const filteredTraces = useMemo(() => {
    if (filter === "llm") return traces.filter((t) => !t.cached);
    if (filter === "redacted") return traces.filter((t) => t.redacted || t.redaction_count > 0);
    if (filter === "negative") return traces.filter((t) => t.feedback === "down");
    return traces;
  }, [traces, filter]);

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-black text-zinc-900 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-[#932120]" /> Nhật ký Trace &amp; Token Thời gian thực ({filteredTraces.length})
        </h4>
        <div className="flex flex-wrap items-center gap-1.5">
          {([["all", "Tất cả"], ["llm", "Gọi LLM"], ["redacted", "Anti-Spoiler chặn"], ["negative", "Đánh giá 👎"]] as const).map(([k, lbl]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${filter === k ? "bg-[#932120] text-white" : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"}`}>{lbl}</button>
          ))}
          <button type="button" onClick={onRefresh} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-zinc-200 text-[11px] font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Làm mới
          </button>
        </div>
      </div>
      {filteredTraces.length === 0 ? (
        <p className="text-xs text-zinc-400 py-6 text-center">Không có bản ghi Trace phù hợp bộ lọc.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px]">
            <thead>
              <tr className="border-b border-zinc-200 text-[10px] font-bold uppercase text-zinc-500">
                <th className="py-1.5 pr-2">Đề &amp; Câu</th>
                <th className="py-1.5 px-2">Model / Nguồn</th>
                <th className="py-1.5 px-2 text-right">In / Out / Total</th>
                <th className="py-1.5 px-2 text-right">TTFT · Latency · TPS</th>
                <th className="py-1.5 px-2 text-right">Chi phí</th>
                <th className="py-1.5 px-2">Trạng thái</th>
                <th className="py-1.5 pl-2">Câu hỏi / Trả lời</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredTraces.map((tr) => (
                <tr key={tr.trace_id} className="align-top hover:bg-zinc-50/70">
                  <td className="py-2 pr-2 whitespace-nowrap">
                    <div className="font-bold text-zinc-900">{tr.test_title || tr.skill.toUpperCase()}</div>
                    <div className="text-[10px] text-zinc-500">
                      {tr.skill.toUpperCase()} · {tr.target_question_no ? `Q${tr.target_question_no}` : "Nhóm"} · {tr.unlocked ? "Unlock" : `Tier ${tr.hint_tier}`}
                    </div>
                  </td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    <div className="font-mono font-bold text-zinc-800">{tr.model}</div>
                    <div className="text-[10px] text-zinc-500">{tr.token_source === "provider_usage" ? "Provider Usage" : tr.token_source === "cache" ? "Redis Cache" : "Estimated BPE"}</div>
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap">
                    {tr.cached ? (
                      <span className="font-bold text-emerald-700">+{tr.cached_tokens_saved} saved</span>
                    ) : (
                      <>
                        <div className="font-bold text-zinc-900">{tr.total_tokens.toLocaleString("vi-VN")}</div>
                        <div className="text-[10px] text-zinc-500">{tr.prompt_tokens} / {tr.completion_tokens}</div>
                      </>
                    )}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums whitespace-nowrap text-zinc-600">
                    {tr.cached ? "0ms (Cache)" : `${tr.ttft_ms}ms · ${tr.elapsed_ms}ms · ${tr.tokens_per_sec} t/s`}
                  </td>
                  <td className="py-2 px-2 text-right tabular-nums font-bold text-zinc-800 whitespace-nowrap">${tr.cost_usd.toFixed(5)}</td>
                  <td className="py-2 px-2 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {tr.redacted && <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">Lọc x{tr.redaction_count || 1}</span>}
                      {tr.feedback === "up" && <ThumbsUp className="w-3.5 h-3.5 text-emerald-600" />}
                      {tr.feedback === "down" && <ThumbsDown className="w-3.5 h-3.5 text-rose-600" />}
                      {!tr.redacted && !tr.feedback && <span className="text-[10px] text-zinc-400">{tr.finish_reason}</span>}
                    </div>
                  </td>
                  <td className="py-2 pl-2 max-w-[260px]">
                    <div className="truncate font-semibold text-zinc-800" title={tr.question_preview}>{tr.question_preview}</div>
                    <div className="truncate text-[10px] text-zinc-500" title={tr.answer_preview}>{tr.answer_preview}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
