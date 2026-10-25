"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical, CheckCircle2 } from 'lucide-react';
import { mockSpeakingExamDataset } from '@/mocks/exam-speaking';
import { SpeakingScoreCertificate } from '../speaking/speaking-score-certificate';
import { SpeakingOverallTab } from '../speaking/speaking-overall-tab';
import { SpeakingCriteriaTabs } from '../speaking/speaking-criteria-tabs';

interface SpeakingSummaryResultProps {
  testId?: string;
  attemptId?: string;
  testTitle?: string;
  onRetake?: () => void;
}

export const SpeakingSummaryResult: React.FC<SpeakingSummaryResultProps> = ({
  testId = 'speaking-test-1',
  attemptId,
  onRetake,
}) => {
  const router = useRouter();
  const summary = mockSpeakingExamDataset.summary;

  const [activeTab, setActiveTab] = useState<'overall' | 'fc' | 'lr' | 'gra' | 'pr'>('overall');

  const handleNavigateToDetail = () => {
    router.push(`/test-practice/speaking/${testId}/detail`);
  };

  return (
    <div className="min-h-screen bg-[#0071f9] text-slate-800 pb-16 select-none">
      {/* Top Header Bar */}
      <header className="w-full max-w-5xl mx-auto px-4 py-4 flex items-center justify-between text-white">
        <Link
          href={`/test-practice/speaking/${testId}`}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
          title="Quay lại"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>

        <h1 className="text-base sm:text-lg font-extrabold tracking-wide">
          Kết quả
        </h1>

        <div className="flex items-center gap-2">
          <Link
            href="/test-practice"
            className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-white font-bold text-xs transition-colors"
          >
            Hoàn thành
          </Link>
          <button className="p-1.5 rounded-lg hover:bg-white/10 text-white/80">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-5xl mx-auto px-4 space-y-8">
        {/* 1. Certificate Card Component */}
        <SpeakingScoreCertificate
          summary={summary}
          onViewDetail={handleNavigateToDetail}
        />

        {/* 2. Detailed Tabs White Card */}
        <div className="w-full bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-100 space-y-6">
          {/* Tab Navigation Row */}
          <div className="flex items-center gap-2 sm:gap-6 border-b border-slate-100 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setActiveTab('overall')}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors relative ${
                activeTab === 'overall'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Overall
              {activeTab === 'overall' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('fc')}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors relative ${
                activeTab === 'fc'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Fluency and Coherence
              {activeTab === 'fc' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('lr')}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors relative ${
                activeTab === 'lr'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Lexical Resource
              {activeTab === 'lr' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('gra')}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors relative ${
                activeTab === 'gra'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Grammatical Range and Accuracy
              {activeTab === 'gra' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('pr')}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors relative ${
                activeTab === 'pr'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Pronunciation
              {activeTab === 'pr' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>
          </div>

          {/* Tab Content Display */}
          {activeTab === 'overall' && (
            <SpeakingOverallTab
              summary={summary}
              onViewDetail={handleNavigateToDetail}
            />
          )}

          {activeTab === 'fc' && (
            <SpeakingCriteriaTabs
              criterionKey="fc"
              data={summary.criteria_breakdown.fc}
            />
          )}

          {activeTab === 'lr' && (
            <SpeakingCriteriaTabs
              criterionKey="lr"
              data={summary.criteria_breakdown.lr}
            />
          )}

          {activeTab === 'gra' && (
            <SpeakingCriteriaTabs
              criterionKey="gra"
              data={summary.criteria_breakdown.gra}
            />
          )}

          {activeTab === 'pr' && (
            <SpeakingCriteriaTabs
              criterionKey="pr"
              data={summary.criteria_breakdown.pr}
            />
          )}
        </div>

        {/* Bottom Floating Navigation Button */}
        <div className="flex justify-center pt-2">
          <button
            onClick={handleNavigateToDetail}
            className="px-8 py-3.5 bg-white hover:bg-blue-50 text-blue-600 hover:text-blue-700 font-bold text-xs sm:text-sm rounded-full shadow-lg border border-blue-200 transition-all hover:scale-105 active:scale-95"
          >
            Xem kết quả chi tiết từng câu
          </button>
        </div>
      </main>
    </div>
  );
};
