"use client";

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  Clock,
  ArrowRight,
  RotateCcw,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  FileSearch,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useWritingAttemptSummary, WritingTaskSummary } from '@/hooks/useWritingAttemptSummary';

interface WritingSummaryResultProps {
  testId: string;
  testTitle?: string;
  attemptId?: string;
  returnUrl?: string;
}

// IELTS band descriptor shown under the overall band
function bandLabel(band: number): string {
  if (band >= 8.5) return 'Expert User';
  if (band >= 7.5) return 'Very Good User';
  if (band >= 6.5) return 'Good User';
  if (band >= 5.5) return 'Competent User';
  if (band >= 4.5) return 'Modest User';
  if (band >= 3.5) return 'Limited User';
  return 'Extremely Limited User';
}

const CRITERIA = [
  { key: 'task_response', label: 'Task Response / Achievement' },
  { key: 'coherence_cohesion', label: 'Coherence & Cohesion' },
  { key: 'lexical_resource', label: 'Lexical Resource' },
  { key: 'grammatical_range_and_accuracy', label: 'Grammatical Range' },
] as const;

const TASK_LABEL: Record<string, string> = { task1: 'Task 1', task2: 'Task 2' };
const MIN_WORDS: Record<string, number> = { task1: 150, task2: 250 };

function formatBand(value?: number | null): string {
  return typeof value === 'number' ? value.toFixed(1) : '–';
}

function TaskStatusBadge({ task }: { task: WritingTaskSummary }) {
  if (task.status === 'completed') return <span className="text-emerald-700 font-bold">Đã chấm</span>;
  if (task.status === 'failed') return <span className="text-red-700 font-bold">Chấm lỗi</span>;
  return (
    <span className="text-amber-700 font-bold inline-flex items-center gap-1">
      <Loader2 className="w-3 h-3 animate-spin" /> {task.status === 'evaluating' ? 'AI đang chấm...' : 'Đang chờ chấm'}
    </span>
  );
}

export const WritingSummaryResult: React.FC<WritingSummaryResultProps> = ({
  testId,
  testTitle = 'Writing Academic Test',
  attemptId,
  returnUrl,
}) => {
  const { data, error } = useWritingAttemptSummary(attemptId);
  const tasks = data?.tasks ?? [];
  const graded = tasks.filter((t) => t.status === 'completed' && t.scores);
  const done = Boolean(data?.gradingDone);
  const overallBand = data?.overallBand ?? 0;
  // Feedback highlights: Task 2 first (it weighs double), then Task 1
  const ordered = [...graded].sort((a, b) => (a.task === 'task2' ? -1 : b.task === 'task2' ? 1 : 0));
  const strengths = ordered.flatMap((t) => t.strengths.map((s) => `${TASK_LABEL[t.task] ?? t.task}: ${s}`)).slice(0, 3);
  const improvements = ordered.flatMap((t) => t.areas_to_improve.map((s) => `${TASK_LABEL[t.task] ?? t.task}: ${s}`)).slice(0, 3);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-4 px-3 sm:px-6">
      {/* Top banner: grading status + overall band */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-50/60 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            {done ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bài thi đã được AI chấm điểm xong</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>AI đang chấm bài (khoảng 1 phút mỗi task) — trang tự cập nhật</span>
              </div>
            )}
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              Kết Quả Đánh Giá Bài Thi Writing
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium">{data?.title || testTitle}</p>
            {error && (
              <p className="text-xs text-red-600 inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-red-50 to-amber-50/40 rounded-2xl border border-red-100 min-w-[170px] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Overall Band</span>
            {done && overallBand > 0 ? (
              <>
                <span className="text-5xl font-black text-[#932120] tracking-tight my-1">{overallBand.toFixed(1)}</span>
                <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  {bandLabel(overallBand)}
                </span>
              </>
            ) : (
              <Loader2 className="w-10 h-10 text-[#932120] animate-spin my-3" />
            )}
            <span className="text-[10px] text-zinc-400 mt-1">(Task 1 + 2 × Task 2) / 3</span>
          </div>
        </div>

        {/* Criterion scores per task */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-zinc-100">
          {CRITERIA.map((c) => (
            <div key={c.key} className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center space-y-1">
              <span className="text-[11px] font-bold text-zinc-500 block">{c.label}</span>
              {tasks.map((t) => (
                <div key={t.essay_id} className="flex justify-between text-xs">
                  <span className="text-zinc-500">{TASK_LABEL[t.task] ?? t.task}</span>
                  <strong className="text-zinc-900">{formatBand(t.scores?.[c.key])}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Per-task status, band and word count */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Thống kê bài viết</span>
          </h3>
          <div className="space-y-2 text-xs">
            {tasks.map((t) => {
              const min = MIN_WORDS[t.task] ?? 0;
              return (
                <div key={t.essay_id} className="py-1.5 border-b border-zinc-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">{TASK_LABEL[t.task] ?? t.task}{t.task_subtype ? ` · ${t.task_subtype}` : ''}</span>
                    <TaskStatusBadge task={t} />
                  </div>
                  <div className="flex justify-between">
                    <span className={t.word_count >= min ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>
                      {t.word_count} từ (Chuẩn ≥ {min})
                    </span>
                    <strong className="text-[#932120]">Band {formatBand(t.scores?.overall_band)}</strong>
                  </div>
                </div>
              );
            })}
            {!tasks.length && <p className="text-zinc-400">Đang tải...</p>}
          </div>
        </div>

        {/* Strengths & improvements from the AI feedback */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Nhận xét tổng quan và định hướng cải thiện</span>
          </h3>
          {graded.length ? (
            <div className="space-y-2.5 text-xs text-zinc-600 leading-relaxed">
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <strong className="text-emerald-800 block mb-0.5">Ưu điểm nổi bật:</strong>
                <ul className="list-disc pl-4 space-y-0.5">{strengths.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                <strong className="text-amber-800 block mb-0.5">Điểm cần cải thiện:</strong>
                <ul className="list-disc pl-4 space-y-0.5">{improvements.map((s) => <li key={s}>{s}</li>)}</ul>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Nhận xét sẽ hiện khi AI chấm xong.</p>
          )}
        </div>
      </div>

      {/* Actions: back / retake / per-task detailed result with inline corrections */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href={returnUrl || "/test-practice"}
            className="h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </Link>
          <Link
            href={`/test-practice/writing/${testId}${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`}
            className="h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Làm lại bài</span>
          </Link>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {graded.map((t) => (
            <Link
              key={t.essay_id}
              id={`btn-view-detailed-writing-${t.task}`}
              href={`/results/${t.essay_id}`}
              className="h-10 px-5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
            >
              <FileSearch className="w-4 h-4" />
              <span>Chi tiết & chữa lỗi {TASK_LABEL[t.task] ?? t.task}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
