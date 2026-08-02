"use client";

import React, { use, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { EssayHighlighter, HighlightLegend } from '@/components/workspace/EssayHighlighter';
import { ScoreSidebar, CriterionTab } from '@/components/workspace/ScoreSidebar';
import { InlineAnnotation, GradingResult } from '@/types';
import { getEssayResults } from '@/services/essays';
import { mapApiResultToGradingResult } from '@/lib/adapters';

export default function ResultsPage({ params }: { params: Promise<{ essayId: string }> }) {
  const { essayId } = use(params);
  
  const [activeCriterion, setActiveCriterion] = useState<CriterionTab>("OVERALL");
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);
  const [activeTypes, setActiveTypes] = useState<string[]>(['error', 'logic_issue', 'upgrade', 'strength']);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchResults() {
      try {
        setLoading(true);
        const resData = await getEssayResults(essayId);
        const mappedResult = mapApiResultToGradingResult(resData);
        setResult(mappedResult);
      } catch (err: unknown) {
        console.error("Failed to load results:", err);
        setError("Không thể tải kết quả. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    }
    fetchResults();
  }, [essayId]);

  const handleAnnotationClick = useCallback((ann: InlineAnnotation) => {
    setActiveCriterion(ann.category);
    setActiveAnnotationId(ann.id);
  }, []);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white border border-zinc-200 rounded-full hover:bg-zinc-50 text-zinc-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Chi tiết kết quả (Bài #{essayId.split('-')[0]})</h1>
            {result && <p className="text-sm text-zinc-500">Trạng thái: Hoàn tất</p>}
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-white border border-zinc-200 rounded-2xl shadow-sm relative">
          
          {loading && (
            <div className="absolute inset-0 z-50 bg-white/80 flex items-center justify-center flex-col gap-4">
              <Loader2 className="w-8 h-8 text-[#932120] animate-spin" />
              <p className="text-zinc-600 font-medium">Đang tải kết quả...</p>
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 z-50 bg-white flex items-center justify-center flex-col gap-4">
              <p className="text-red-500 font-medium">{error}</p>
              <button 
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#932120] text-white rounded-lg hover:bg-red-800 transition-colors"
              >
                Thử lại
              </button>
            </div>
          )}

          {!loading && !error && result && (
            <>
              {/* Trái: Phần bài làm */}
              <div className="flex-1 flex flex-col relative overflow-hidden bg-white z-10">
                <div className="px-6 py-3 border-b border-zinc-100 shrink-0 bg-zinc-50/50">
                  <HighlightLegend 
                    activeTypes={activeTypes}
                    onTypesChange={setActiveTypes}
                  />
                </div>
                <div className="flex-1 px-10 py-8 overflow-y-auto">
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
              
              {/* Phải: Score Sidebar */}
              <div className="w-[400px] shrink-0 border-l border-zinc-200 bg-white flex flex-col z-20">
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
