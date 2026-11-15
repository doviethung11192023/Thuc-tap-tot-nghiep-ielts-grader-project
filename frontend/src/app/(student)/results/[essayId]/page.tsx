"use client";

import React, { use, useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { WritingPromptChartCard } from '@/components/workspace/WritingPromptChartCard';
import { EssayHighlighter, HighlightLegend } from '@/components/workspace/EssayHighlighter';
import { ScoreSidebar, CriterionTab } from '@/components/workspace/ScoreSidebar';
import { InlineAnnotation } from '@/types';
import { getEssayResults } from '@/services/essays';
import { mapApiResultToGradingResult } from '@/lib/adapters';

export default function ResultsPage({ params }: { params: Promise<{ essayId: string }> }) {
  const { essayId } = use(params);
  const queryClient = useQueryClient();

  const [activeCriterion, setActiveCriterion] = useState<CriterionTab>("OVERALL");
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<string[]>(['error', 'logic_issue', 'upgrade', 'strength']);

  const { data: resData, isLoading: loading, error: queryError } = useQuery({
    queryKey: ['essay-result', essayId],
    queryFn: () => getEssayResults(essayId),
    staleTime: 60_000,
    retry: 1,
  });

  const result = useMemo(
    () => (resData ? mapApiResultToGradingResult(resData) : null),
    [resData]
  );
  const error = queryError ? "Không thể tải kết quả. Vui lòng thử lại sau." : null;

  useEffect(() => {
    const siblingList = result?.sibling_essays ?? [];
    siblingList.forEach((sib) => {
      if (sib.essay_id && sib.essay_id !== essayId) {
        queryClient.prefetchQuery({
          queryKey: ['essay-result', sib.essay_id],
          queryFn: () => getEssayResults(sib.essay_id),
          staleTime: 60_000,
        });
      }
    });
  }, [result?.sibling_essays, essayId, queryClient]);

  const handleAnnotationClick = useCallback((ann: InlineAnnotation) => {
    setActiveCriterion(ann.category);
    setActiveAnnotationId(ann.id);
  }, []);

  const backHref = result?.test_id && result?.attempt_id
    ? `/test-practice/writing/${result.test_id}/summary?attemptId=${result.attempt_id}`
    : "/test-practice";
  const siblings = result?.sibling_essays ?? [];
  const isExpertOfficial = result?.evaluator_type === "expert" || Boolean(result?.is_score_overridden);

  return (
    <div className="min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            href={backHref}
            aria-label="Quay lại trang tổng kết bài thi"
            className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-white border border-zinc-200 rounded-full hover:bg-zinc-50 text-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#932120]"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-zinc-900">
                {result?.test_title || `Chi tiết kết quả (Bài #${essayId.split('-')[0]})`}
              </h1>
              {result && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#932120]/10 text-[#932120] border border-[#932120]/20">
                  Task {result.task_no}
                </span>
              )}
              {result && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isExpertOfficial
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : "bg-teal-50 text-teal-800 border-teal-200"
                  }`}
                >
                  {isExpertOfficial ? "Chuyên gia chấm chính thức" : "AI IELTS Grader"}
                </span>
              )}
            </div>
            {result && (
              <p className="text-xs sm:text-sm text-zinc-600 mt-0.5">
                Độ dài bài viết: <strong className="text-zinc-900">{result.word_count} từ</strong> (Chuẩn ≥ {result.min_words} từ)
              </p>
            )}
          </div>
        </div>

        {siblings.length > 1 && (
          <nav aria-label="Chuyển đổi bài viết Task 1 và Task 2" className="flex items-center gap-2 shrink-0">
            {siblings.map((s) => {
              const isCurrent = s.essay_id === essayId;
              return (
                <Link
                  key={s.essay_id}
                  href={`/results/${s.essay_id}`}
                  className={`min-h-[44px] px-4 rounded-xl text-xs font-bold inline-flex items-center justify-center border transition-colors ${
                    isCurrent
                      ? "bg-[#932120] text-white border-[#932120] shadow-xs"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  Task {s.task_no} ({s.word_count} từ)
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white border border-zinc-200 rounded-2xl shadow-sm relative">
        {loading && (
          <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center flex-col gap-4">
            <Loader2 className="w-8 h-8 text-[#932120] animate-spin" />
            <p className="text-zinc-600 font-medium">Đang tải kết quả...</p>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 z-50 bg-white flex items-center justify-center flex-col gap-4 p-6 text-center">
            <p className="text-red-600 font-medium">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="min-h-[44px] px-5 py-2 bg-[#932120] text-white rounded-xl text-sm font-bold hover:bg-red-800 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {!loading && !error && result && (
          <>
            <div className="flex-1 flex flex-col relative overflow-hidden bg-white z-10">
              <div className="px-6 py-3 border-b border-zinc-100 shrink-0 bg-zinc-50/50">
                <HighlightLegend
                  activeTypes={activeTypes}
                  onTypesChange={setActiveTypes}
                />
              </div>
              <div className="flex-1 px-5 sm:px-8 py-6 overflow-y-auto space-y-6">
                <WritingPromptChartCard
                  taskNo={result.task_no}
                  taskPrompt={result.task_prompt}
                  chartImageUrl={result.chart_image_url}
                  promptCategory={result.prompt_category}
                  minWords={result.min_words}
                  wordCount={result.word_count}
                  defaultOpen={true}
                />
                <div className="pt-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3">
                    Bài làm của bạn &amp; Chú thích sửa lỗi chi tiết
                  </h2>
                  <EssayHighlighter
                    content={result.content}
                    annotations={result.inline_annotations}
                    onAnnotationClick={handleAnnotationClick}
                    activeAnnotationId={activeAnnotationId}
                    activeCategoryFilter={activeCriterion === "OVERALL" ? null : activeCriterion}
                    activeTypes={activeTypes}
                  />
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[400px] shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-200 bg-white flex flex-col z-20">
              <ScoreSidebar
                result={result}
                activeCriterion={activeCriterion}
                setActiveCriterion={setActiveCriterion}
                activeAnnotationId={activeAnnotationId}
                setActiveAnnotationId={setActiveAnnotationId}
                activeTypes={activeTypes}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
