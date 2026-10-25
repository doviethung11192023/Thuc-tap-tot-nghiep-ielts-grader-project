"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ListFilter, Sparkles, BookOpen, CheckCircle2, RotateCcw } from 'lucide-react';
import { mockSpeakingExamDataset } from '@/mocks/exam-speaking';
import { SpeakingDetailHeader } from './speaking/speaking-detail-header';
import { SpeakingTranscriptViewer } from './speaking/speaking-transcript-viewer';
import { SpeakingStrengthsTab } from './speaking/speaking-strengths-tab';
import { SpeakingImprovementsTab } from './speaking/speaking-improvements-tab';
import { SpeakingUpgradedAnswerTab } from './speaking/speaking-upgraded-answer-tab';
import { SpeakingModelAnswerTab } from './speaking/speaking-model-answer-tab';

interface SpeakingResultsViewProps {
  onRetake?: () => void;
}

export function SpeakingResultsView({ onRetake }: SpeakingResultsViewProps) {
  const router = useRouter();
  const exam = mockSpeakingExamDataset;

  // Question navigation state
  const [currentPart, setCurrentPart] = useState<1 | 2 | 3>(1);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Main 4 Tabs: 'strengths' | 'improvements' | 'upgraded' | 'model'
  const [activeMainTab, setActiveMainTab] = useState<'strengths' | 'improvements' | 'upgraded' | 'model'>('strengths');

  // Sub-filter pill state
  const [activePill, setActivePill] = useState<string>('collocations');

  // Selected keyword for 2-way highlight
  const [selectedKeyword, setSelectedKeyword] = useState<string | null>(null);

  const activePartData = exam.parts.find((p) => p.part_number === currentPart) || exam.parts[0];
  const questions =
    activePartData.questions ||
    (activePartData.cue_card
      ? [
          {
            id: 'p2_cue',
            question_number: 1,
            question: activePartData.cue_card.topic,
            ideas: activePartData.cue_card.ideas,
          },
        ]
      : []);

  // Use detailed result from Part 1 Question 1 as mock data baseline
  const detailedData = exam.parts[0].questions![0].detailed_result!;

  // Handle question navigation
  const handleSelectQuestion = (partNum: 1 | 2 | 3, qIdx: number) => {
    setCurrentPart(partNum);
    setCurrentQuestionIndex(qIdx);
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    } else if (currentPart > 1) {
      const prevPart = (currentPart - 1) as 1 | 2 | 3;
      setCurrentPart(prevPart);
      setCurrentQuestionIndex(0);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex((prev) => prev + 1);
    } else if (currentPart < 3) {
      const nextPart = (currentPart + 1) as 1 | 2 | 3;
      setCurrentPart(nextPart);
      setCurrentQuestionIndex(0);
    }
  };

  const hasPrev = currentPart > 1 || currentQuestionIndex > 0;
  const hasNext = currentPart < 3 || currentQuestionIndex + 1 < questions.length;

  // Handle 2-way keyword click from transcript
  const handleTranscriptKeywordClick = (keyword: string) => {
    setActiveMainTab('strengths');
    setActivePill('collocations');
    setSelectedKeyword(keyword);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between select-none">
      {/* 1. Header with Question Picker Dropdown & Navigation */}
      <SpeakingDetailHeader
        parts={exam.parts}
        currentPart={currentPart}
        currentQuestionIndex={currentQuestionIndex}
        onSelectQuestion={handleSelectQuestion}
        onPrev={handlePrev}
        onNext={handleNext}
        hasPrev={hasPrev}
        hasNext={hasNext}
      />

      {/* 2. Main 2-Column Split Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Question Info, Audio Player & Interactive Transcript */}
        <div className="lg:col-span-6 space-y-6 lg:sticky lg:top-28">
          <SpeakingTranscriptViewer
            questionTitle={`Question ${currentQuestionIndex + 1}`}
            questionPrompt={questions[currentQuestionIndex]?.question || activePartData.cue_card?.topic || ''}
            ratingBadge={detailedData.rating_badge}
            audioDuration={detailedData.audio_duration}
            activeFilter={
              activeMainTab === 'improvements'
                ? activePill === 'grammar'
                  ? 'grammar'
                  : 'pronunciation_improve'
                : activePill
            }
            highlightedKeyword={selectedKeyword}
            onSelectKeyword={handleTranscriptKeywordClick}
          />
        </div>

        {/* Right Column: 4 Main Tabs & Deep Learning Cards */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-6">
          {/* 4 Main Tabs Bar */}
          <div className="flex items-center gap-1 sm:gap-4 border-b border-slate-100 pb-1 overflow-x-auto no-scrollbar">
            {/* Tab 1: Ưu điểm */}
            <button
              onClick={() => {
                setActiveMainTab('strengths');
                setActivePill('collocations');
              }}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                activeMainTab === 'strengths'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Ưu điểm</span>
              {activeMainTab === 'strengths' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>

            {/* Tab 2: Cần cải thiện */}
            <button
              onClick={() => {
                setActiveMainTab('improvements');
                setActivePill('grammar');
              }}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                activeMainTab === 'improvements'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5 text-red-500" />
              <span>Cần cải thiện</span>
              {activeMainTab === 'improvements' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>

            {/* Tab 3: Bài nâng cấp */}
            <button
              onClick={() => setActiveMainTab('upgraded')}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                activeMainTab === 'upgraded'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Bài nâng cấp</span>
              {activeMainTab === 'upgraded' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>

            {/* Tab 4: Bài mẫu */}
            <button
              onClick={() => setActiveMainTab('model')}
              className={`pb-3 font-bold text-xs sm:text-sm whitespace-nowrap transition-colors relative flex items-center gap-1.5 ${
                activeMainTab === 'model'
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bài mẫu</span>
              {activeMainTab === 'model' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></div>
              )}
            </button>
          </div>

          {/* Active Tab Panel Content */}
          {activeMainTab === 'strengths' && (
            <SpeakingStrengthsTab
              data={detailedData}
              activePill={activePill}
              onPillChange={setActivePill}
              selectedKeyword={selectedKeyword}
            />
          )}

          {activeMainTab === 'improvements' && (
            <SpeakingImprovementsTab
              data={detailedData}
              activePill={activePill}
              onPillChange={setActivePill}
            />
          )}

          {activeMainTab === 'upgraded' && (
            <SpeakingUpgradedAnswerTab data={detailedData.upgraded_answer} />
          )}

          {activeMainTab === 'model' && (
            <SpeakingModelAnswerTab data={detailedData.model_answer} />
          )}
        </div>
      </main>
    </div>
  );
}
