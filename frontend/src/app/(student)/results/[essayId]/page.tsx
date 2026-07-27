"use client";

import React, { use, useState, useCallback } from 'react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EssayHighlighter, HighlightLegend } from '@/components/workspace/EssayHighlighter';
import { ScoreSidebar, CriterionTab } from '@/components/workspace/ScoreSidebar';
import { DUMMY_RESULT, InlineAnnotation } from '@/components/workspace/dummy_data';

export default function ResultsPage({ params }: { params: Promise<{ essayId: string }> }) {
  const { essayId } = use(params);
  
  const [activeCriterion, setActiveCriterion] = useState<CriterionTab>("OVERALL");
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  const handleAnnotationClick = useCallback((ann: InlineAnnotation) => {
    setActiveCriterion(ann.category);
    setActiveAnnotationId(ann.id);
  }, []);

  return (
    <StudentPageLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        <div className="mb-4 flex items-center gap-4">
          <Link href="/dashboard" className="p-2 bg-white border border-zinc-200 rounded-full hover:bg-zinc-50 text-zinc-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-900">Chi tiết kết quả (Bài #{essayId || '123'})</h1>
            <p className="text-sm text-zinc-500">Đã nộp lúc 10:45 AM, 21/07/2026</p>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden bg-white border border-zinc-200 rounded-2xl shadow-sm relative">
          
          {/* Trái: Phần bài làm */}
          <div className="flex-1 flex flex-col relative overflow-hidden bg-white z-10">
            <div className="px-6 py-3 border-b border-zinc-100 shrink-0 bg-zinc-50/50">
              <HighlightLegend />
            </div>
            <div className="flex-1 px-10 py-8 overflow-y-auto">
              <EssayHighlighter
                content={DUMMY_RESULT.content}
                annotations={DUMMY_RESULT.inline_annotations}
                onAnnotationClick={handleAnnotationClick}
                activeAnnotationId={activeAnnotationId}
                activeCategoryFilter={activeCriterion === "OVERALL" ? null : activeCriterion}
              />
            </div>
          </div>
          
          {/* Phải: Score Sidebar */}
          <div className="w-[400px] shrink-0 border-l border-zinc-200 bg-white flex flex-col z-20">
            <ScoreSidebar
              result={DUMMY_RESULT}
              activeCriterion={activeCriterion}
              setActiveCriterion={setActiveCriterion}
              activeAnnotationId={activeAnnotationId}
            />
          </div>
        </div>
      </div>
    </StudentPageLayout>
  );
}
