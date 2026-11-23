"use client";

import React, { useState } from "react";
import Link from "next/link";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getGapCaseDetail } from "@/services/admin-ai-monitoring";
import { GapAiRunsList } from "./GapAiRunsList";
import { GapScoreColumn } from "./GapScoreColumn";
import { GapSpeakingTranscript } from "./GapSpeakingTranscript";
import { GapWritingAnnotated } from "./GapWritingAnnotated";
import { MODE_LABEL, SKILL_LABEL, formatBand, formatDateTime } from "./monitoring-format";

/** Trang so sánh một bài: AI | Expert, lượt chấm AI, bài viết tô lỗi hoặc transcript. */
export function GapCaseDetailView({ attemptId }: { attemptId: string }) {
  const [aiEvaluationId, setAiEvaluationId] = useState<string | undefined>();
  const { data, isLoading, isError, isFetching } = useQuery({
    queryKey: ["admin-gap-case", attemptId, aiEvaluationId],
    queryFn: () => getGapCaseDetail(attemptId, aiEvaluationId),
    placeholderData: keepPreviousData,
  });

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#932120]" /></div>;
  if (isError || !data) return <p className="py-10 text-center text-zinc-500">Không có cặp điểm AI – Expert cho bài này.</p>;

  const isWriting = data.attempt.skill === "writing";
  const { attempt } = data;
  return (
    <div className="space-y-5 w-full">
      <Link href="/admin/ai-gap" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-[#932120]">
        <ArrowLeft className="w-4 h-4" /> Danh sách ca lệch
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">{attempt.test_title ?? "Bài làm"}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {SKILL_LABEL[attempt.skill] ?? attempt.skill}{attempt.mode ? ` · ${MODE_LABEL[attempt.mode] ?? attempt.mode}` : ""}
            {" · "}nộp lúc {formatDateTime(attempt.submitted_at)} · <span className="font-mono">{attempt.id.slice(0, 8)}</span>
          </p>
        </div>
        <label className="text-sm text-zinc-600 inline-flex items-center gap-2">
          Lần chấm AI
          <select value={data.ai.evaluation_id} onChange={(e) => setAiEvaluationId(e.target.value)}
            className="min-h-[40px] rounded-xl border border-zinc-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/30">
            {data.ai_evaluations.map((ev) => (
              <option key={ev.id} value={ev.id}>{formatDateTime(ev.created_at)} · band {formatBand(ev.overall_band)}{ev.is_official ? " · chính thức" : ""}</option>
            ))}
          </select>
          {isFetching && <Loader2 className="w-4 h-4 animate-spin text-[#932120]" />}
        </label>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <GapScoreColumn title="AI" tone="ai" overall={data.ai.overall_band} criteria={data.ai.criteria} showTaskNo={isWriting}>
          <GapAiRunsList runs={data.ai.runs} />
        </GapScoreColumn>
        <GapScoreColumn title="Expert" tone="expert" overall={data.expert.overall_band} criteria={data.expert.criteria} showTaskNo={isWriting}>
          <p className="text-xs text-zinc-500">Chấm lúc {formatDateTime(data.expert.scored_at)}</p>
          {data.expert.reason && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-800">Lý do Expert đổi điểm</p>
              <p className="mt-1 text-sm text-emerald-900 whitespace-pre-wrap">{data.expert.reason}</p>
            </div>
          )}
          {data.expert.feedback && (
            <div className="rounded-xl border border-zinc-200 bg-white p-3.5">
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Nhận xét chung</p>
              <p className="mt-1 text-sm text-zinc-800 whitespace-pre-wrap">{data.expert.feedback}</p>
            </div>
          )}
        </GapScoreColumn>
      </div>

      <GapWritingAnnotated tasks={data.writing} />
      <GapSpeakingTranscript items={data.speaking} />
    </div>
  );
}
