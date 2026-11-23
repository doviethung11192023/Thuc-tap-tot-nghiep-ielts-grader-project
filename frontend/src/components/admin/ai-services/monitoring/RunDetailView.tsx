"use client";

import React, { useCallback } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Loader2, RotateCcw } from "lucide-react";
import { getGradingRun } from "@/services/admin-ai-monitoring";
import { JsonDisclosure } from "./JsonDisclosure";
import { RegradeConfirmModal } from "./RegradeConfirmModal";
import { RunStatusBadge } from "./RunStatusBadge";
import { ATTEMPT_STATUS_LABEL, EVALUATION_STATUS_LABEL, MODE_LABEL, SKILL_LABEL, formatBand, formatCost, formatDateTime, formatLatency, formatNumber, formatPromptVersions } from "./monitoring-format";
import { useRegradeFlow } from "./use-regrade-flow";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-900 break-words">{children}</dd>
    </div>
  );
}

const CARD = "bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs";

/** Chi tiết một lượt chấm: thông tin lượt, evaluation, attempt, lỗi đầy đủ, output JSON, chạy lại. */
export function RunDetailView({ runId }: { runId: string }) {
  const queryClient = useQueryClient();
  const { data: run, isLoading, isError } = useQuery({ queryKey: ["admin-grading-run", runId], queryFn: () => getGradingRun(runId) });
  const onDone = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["admin-grading-run", runId] });
    void queryClient.invalidateQueries({ queryKey: ["admin-grading-runs"] });
  }, [queryClient, runId]);
  const regrade = useRegradeFlow(onDone);

  if (isLoading) return <div className="flex justify-center py-16"><Loader2 className="w-7 h-7 animate-spin text-[#932120]" /></div>;
  if (isError || !run) return <p className="py-10 text-center text-zinc-500">Không tìm thấy lượt chấm.</p>;

  return (
    <div className="space-y-5 w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin/ai-services/runs" className="inline-flex items-center gap-1.5 text-sm font-semibold text-zinc-600 hover:text-[#932120]">
          <ArrowLeft className="w-4 h-4" /> Danh sách lượt chấm
        </Link>
        <div className="flex gap-2.5">
          {run.trace_url && (
            <a href={run.trace_url} target="_blank" rel="noopener noreferrer"
              className="min-h-[40px] bg-white border border-zinc-200 rounded-xl px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-2">
              Mở trace <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {run.attempt_id && (
            <button type="button" disabled={regrade.loading} onClick={() => void regrade.start([run.attempt_id as string])}
              className="min-h-[40px] bg-[#932120] hover:bg-[#7a1a19] text-white rounded-xl px-4 text-sm font-bold inline-flex items-center gap-2 disabled:opacity-50">
              {regrade.loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />} Chạy lại bài này
            </button>
          )}
        </div>
      </div>

      <section className={CARD}>
        <h2 className="text-base font-bold text-zinc-900 mb-4">Lượt chấm</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label="Trạng thái"><RunStatusBadge status={run.status} isStuck={run.is_stuck} /></Field>
          <Field label="Kỹ năng">{run.skill ? SKILL_LABEL[run.skill] ?? run.skill : "—"}{run.task_no ? ` · Task ${run.task_no}` : ""}</Field>
          <Field label="Mode">{run.mode ? MODE_LABEL[run.mode] ?? run.mode : "—"}</Field>
          <Field label="Model"><span className="font-mono">{run.model ?? "—"}</span></Field>
          <Field label="Phiên bản prompt"><span className="font-mono">{formatPromptVersions(run.prompt_versions)}</span></Field>
          <Field label="Token vào / ra">{formatNumber(run.input_tokens)} / {formatNumber(run.output_tokens)}</Field>
          <Field label="Chi phí">{formatCost(run.cost_usd)}</Field>
          <Field label="Thời gian chạy">{formatLatency(run.latency_ms)}</Field>
          <Field label="Bắt đầu">{formatDateTime(run.started_at)}</Field>
          <Field label="Kết thúc">{formatDateTime(run.finished_at)}</Field>
          <Field label="Mã lượt"><span className="font-mono text-xs">{run.id}</span></Field>
        </dl>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <section className={CARD}>
          <h2 className="text-base font-bold text-zinc-900 mb-4">Evaluation</h2>
          {run.evaluation ? (
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Trạng thái">{EVALUATION_STATUS_LABEL[run.evaluation.status] ?? run.evaluation.status}</Field>
              <Field label="Band tổng">{formatBand(run.evaluation.overall_band)}</Field>
              <Field label="Chính thức">{run.evaluation.is_official ? "Có" : "Không"}</Field>
              <Field label="Mã"><span className="font-mono text-xs">{run.evaluation.id}</span></Field>
            </dl>
          ) : <p className="text-sm text-zinc-500">Không có dữ liệu evaluation.</p>}
        </section>
        <section className={CARD}>
          <h2 className="text-base font-bold text-zinc-900 mb-4">Attempt</h2>
          {run.attempt ? (
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Đề thi">{run.attempt.test_title ?? "—"}</Field>
              <Field label="Trạng thái">{ATTEMPT_STATUS_LABEL[run.attempt.status] ?? run.attempt.status}</Field>
              <Field label="Kỹ năng · Mode">{SKILL_LABEL[run.attempt.skill] ?? run.attempt.skill} · {run.attempt.mode ? MODE_LABEL[run.attempt.mode] ?? run.attempt.mode : "—"}</Field>
              <Field label="Mã"><span className="font-mono text-xs">{run.attempt.id}</span></Field>
            </dl>
          ) : <p className="text-sm text-zinc-500">Không có dữ liệu attempt.</p>}
        </section>
      </div>

      {run.error && (
        <section className={CARD}>
          <h2 className="text-base font-bold text-red-700 mb-3">Lỗi</h2>
          <pre className="text-xs bg-red-50 border border-red-100 text-red-900 rounded-xl p-4 overflow-auto max-h-96 whitespace-pre-wrap break-words">{run.error}</pre>
        </section>
      )}
      <JsonDisclosure title="Output của lượt chấm (JSON)" value={run.output} />

      {regrade.preview && (
        <RegradeConfirmModal preview={regrade.preview} submitting={regrade.submitting} onConfirm={() => void regrade.confirm()} onClose={regrade.close} />
      )}
    </div>
  );
}
