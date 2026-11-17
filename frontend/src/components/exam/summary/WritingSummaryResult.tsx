"use client";

import React, { useState, useEffect } from 'react';
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
  GraduationCap,
} from 'lucide-react';
import { useWritingAttemptSummary, WritingTaskSummary } from '@/hooks/useWritingAttemptSummary';
import { WritingPromptChartCard } from '@/components/workspace/WritingPromptChartCard';
import { requestPracticeExpertReview } from '@/services/expert';
import { retryAiGrading } from '@/services/student-test-practice';
import { useQueryClient } from '@tanstack/react-query';
import { getEssayResults } from '@/services/essays';
import { invalidatePracticeHistoryCache } from '@/services/practice-history-cache';
import toast from 'react-hot-toast';

interface WritingSummaryResultProps {
  testId: string;
  testTitle?: string;
  attemptId?: string;
  returnUrl?: string;
}

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
  { key: 'task_response', label: 'Task Achievement / Response' },
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
  if (task.status === 'not_attempted') return <span className="text-zinc-500 font-bold">Không làm</span>;
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
  const queryClient = useQueryClient();
  const { data, error, reload } = useWritingAttemptSummary(attemptId);
  const tasks = data?.tasks ?? [];

  useEffect(() => {
    tasks.forEach((t) => {
      if (t.essay_id && t.status === 'completed') {
        queryClient.prefetchQuery({
          queryKey: ['essay-result', t.essay_id],
          queryFn: () => getEssayResults(t.essay_id),
          staleTime: 60_000,
        });
      }
    });
  }, [tasks, queryClient]);
  const graded = tasks.filter((t) => t.status === 'completed' && t.scores);
  const failedTasks = tasks.filter((t) => t.status === 'failed');
  const isGradingFailed =
    data?.status === 'grading_failed' ||
    data?.evaluationStatus === 'failed' ||
    (tasks.length > 0 && failedTasks.length === tasks.length);
  const hasAnyFailed = isGradingFailed || failedTasks.length > 0;
  const done = Boolean(data?.gradingDone);
  const isExpertOfficial = data?.evaluatorType === 'expert';
  const overallBand = data?.overallBand ?? 0;

  const ordered = [...graded].sort((a, b) => (a.task === 'task2' ? -1 : b.task === 'task2' ? 1 : 0));
  const strengths = ordered.flatMap((t) => t.strengths.map((s) => `${TASK_LABEL[t.task] ?? t.task}: ${s}`)).slice(0, 3);
  const improvements = ordered.flatMap((t) => t.areas_to_improve.map((s) => `${TASK_LABEL[t.task] ?? t.task}: ${s}`)).slice(0, 3);

  const [requestingExpert, setRequestingExpert] = useState(false);
  const [expertRequested, setExpertRequested] = useState(false);
  const [retryingAi, setRetryingAi] = useState(false);

  useEffect(() => {
    if (done) invalidatePracticeHistoryCache();
  }, [done]);

  const handleRequestExpert = async () => {
    if (!attemptId) return;
    try {
      setRequestingExpert(true);
      await requestPracticeExpertReview(attemptId);
      setExpertRequested(true);
      toast.success("Đã gửi yêu cầu Chuyên gia chấm lại thành công (SLA trong 48h làm việc)!");
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Lỗi khi gửi yêu cầu chấm lại");
    } finally {
      setRequestingExpert(false);
    }
  };

  const handleRetryAi = async () => {
    if (!attemptId) return;
    try {
      setRetryingAi(true);
      await retryAiGrading(attemptId);
      invalidatePracticeHistoryCache();
      toast.success("Đã đưa bài viết vào hàng đợi AI chấm lại! Vui lòng chờ giây lát.");
      reload();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || "Không thể kích hoạt chấm lại bằng AI");
    } finally {
      setRetryingAi(false);
    }
  };

  if (!attemptId) {
    return (
      <div className="w-full max-w-2xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Không tìm thấy thông tin bài nộp</h2>
        <p className="text-sm text-zinc-600 max-w-md mx-auto">
          Không xác định được mã phiên làm bài thi (attemptId). Vui lòng đảm bảo bạn đã bắt đầu và nộp bài với tài khoản Học viên.
        </p>
        <div className="pt-4 flex justify-center gap-3">
          <Link href="/test-practice" className="inline-flex items-center gap-2 px-5 py-2.5 bg-zinc-100 text-zinc-700 rounded-xl text-sm font-bold hover:bg-zinc-200 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Về danh sách đề
          </Link>
          <Link href={`/test-practice/writing/${testId}`} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#932120] text-white rounded-xl text-sm font-bold hover:bg-[#7a1a19] transition-colors shadow-sm">
            <RotateCcw className="w-4 h-4" /> Làm lại bài thi này
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-4 px-3 sm:px-6">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-50/60 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            {isGradingFailed ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Chấm điểm AI gặp sự cố kỹ thuật — Hãy bấm chấm lại bằng AI</span>
              </div>
            ) : data?.status === 'waiting_expert' ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-[#932120] text-xs font-bold border border-red-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Đang chờ Chuyên gia chấm chính thức (SLA 48h) — Điểm số AI mang tính chẩn đoán</span>
              </div>
            ) : isExpertOfficial && done ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                <GraduationCap className="w-4 h-4 text-emerald-700" />
                <span>Bài thi đã được Chuyên gia chấm điểm chính thức</span>
              </div>
            ) : done ? (
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
            <p className="text-xs sm:text-sm text-zinc-600 font-medium">{data?.title || testTitle}</p>
            {hasAnyFailed && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleRetryAi}
                  disabled={retryingAi}
                  className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold transition-colors shadow-xs disabled:opacity-60"
                >
                  {retryingAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Chấm lại bằng AI</span>
                </button>
              </div>
            )}
            {error && (
              <p className="text-xs text-red-600 inline-flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {error}
              </p>
            )}
          </div>

          <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-red-50 to-amber-50/40 rounded-2xl border border-red-100 min-w-[175px] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Overall Band</span>
            {isGradingFailed && !graded.length ? (
              <span className="text-2xl font-black text-red-700 my-3">Chưa có điểm</span>
            ) : done ? (
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
            <span className="text-[10px] text-zinc-500 mt-1">
              {tasks.length >= 2
                ? '(Task 1 + 2 × Task 2) / 3'
                : `Practice ${TASK_LABEL[tasks[0]?.task] ?? 'Writing'}`}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-zinc-100">
          {CRITERIA.map((c) => (
            <div key={c.key} className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center space-y-1">
              <span className="text-[11px] font-bold text-zinc-600 block">{c.label}</span>
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

      {data?.expertFeedback && (
        <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-5 space-y-1.5">
          <h2 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-2">
            <GraduationCap className="w-4 h-4" /> Nhận xét tổng quát của Chuyên gia
          </h2>
          <p className="text-sm text-emerald-950 leading-relaxed whitespace-pre-line">{data.expertFeedback}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Thống kê bài viết</span>
          </h3>
          <div className="space-y-2 text-xs">
            {tasks.map((t) => {
              const min = t.min_words ?? MIN_WORDS[t.task] ?? 0;
              return (
                <div key={t.essay_id} className="py-1.5 border-b border-zinc-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-zinc-600">{TASK_LABEL[t.task] ?? t.task}{t.task_subtype ? ` · ${t.task_subtype}` : ''}</span>
                    <TaskStatusBadge task={t} />
                  </div>
                  <div className="flex justify-between">
                    <span className={t.word_count >= min ? 'font-bold text-emerald-700' : 'font-bold text-amber-700'}>
                      {t.word_count} từ (Chuẩn ≥ {min})
                    </span>
                    {/* Task bỏ trống trong bài làm cả 2 task tính band 0 (BR-04) */}
                    <strong className="text-[#932120]">Band {t.status === 'not_attempted' ? '0.0' : formatBand(t.scores?.overall_band)}</strong>
                  </div>
                </div>
              );
            })}
            {!tasks.length && <p className="text-zinc-500">Đang tải...</p>}
          </div>
        </div>

        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Nhận xét tổng quan và định hướng cải thiện</span>
          </h3>
          {graded.length ? (
            <div className="space-y-2.5 text-xs text-zinc-700 leading-relaxed">
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
                <strong className="text-emerald-800 block mb-0.5">Ưu điểm nổi bật:</strong>
                <ul className="list-disc pl-4 space-y-0.5">
                  {strengths.length ? strengths.map((s) => <li key={s}>{s}</li>) : <li>Chưa ghi nhận ưu điểm nổi bật cho bài viết này.</li>}
                </ul>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
                <strong className="text-amber-800 block mb-0.5">Điểm cần cải thiện:</strong>
                <ul className="list-disc pl-4 space-y-0.5">
                  {improvements.length ? improvements.map((s) => <li key={s}>{s}</li>) : <li>Xem chi tiết chữa lỗi bên trong từng bài viết để cải thiện.</li>}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-xs text-zinc-500">
              {isGradingFailed ? "Chưa có nhận xét do lượt chấm AI trước bị lỗi. Hãy bấm \"Chấm lại bằng AI\"." : "Nhận xét sẽ hiện khi hoàn tất chấm điểm."}
            </p>
          )}
        </div>
      </div>

      {/* Đề bài, Biểu đồ & Bài làm đã nộp */}
      {tasks.length > 0 && (
        <section className="space-y-3" aria-label="Xem lại đề bài, biểu đồ và bài làm">
          <h2 className="text-sm font-bold text-zinc-900 px-1">
            Đề bài, Biểu đồ &amp; Bài làm đã nộp
          </h2>
          {tasks.map((t) => (
            <WritingPromptChartCard
              key={t.essay_id}
              taskNo={t.task_no === 1 || t.task === 'task1' ? 1 : 2}
              taskPrompt={t.task_prompt}
              chartImageUrl={t.chart_image_url}
              promptCategory={t.prompt_category}
              minWords={t.min_words ?? MIN_WORDS[t.task]}
              wordCount={t.word_count}
              studentContent={t.content}
              defaultOpen={true}
            />
          ))}
        </section>
      )}

      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Link href={returnUrl || "/test-practice"} className="min-h-[44px] px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial">
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </Link>
          {data?.mode !== 'mock' && (   /* đề Mock không làm lại được */
          <Link href={`/test-practice/writing/${testId}${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`} className="min-h-[44px] px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial">
            <RotateCcw className="w-4 h-4" />
            <span>Làm lại bài</span>
          </Link>
          )}
          {done && data?.status !== 'waiting_expert' && !isExpertOfficial && (
            <button
              type="button"
              disabled={requestingExpert || expertRequested}
              onClick={handleRequestExpert}
              className={`min-h-[44px] px-4 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial ${
                expertRequested
                  ? "bg-zinc-100 text-zinc-500 border-zinc-200 cursor-not-allowed"
                  : "bg-red-50 hover:bg-red-100 text-[#932120] border-red-200"
              }`}
            >
              {requestingExpert ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : expertRequested ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <GraduationCap className="w-4 h-4" />}
              <span>{expertRequested ? "Đã gửi Chuyên gia" : "Xin Chuyên gia chấm lại"}</span>
            </button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {graded.map((t) => (
            <Link
              key={t.essay_id}
              id={`btn-view-detailed-writing-${t.task}`}
              href={`/results/${t.essay_id}`}
              className="min-h-[44px] px-5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
            >
              <FileSearch className="w-4 h-4" />
              <span>Chi tiết &amp; chữa lỗi {TASK_LABEL[t.task] ?? t.task}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};
