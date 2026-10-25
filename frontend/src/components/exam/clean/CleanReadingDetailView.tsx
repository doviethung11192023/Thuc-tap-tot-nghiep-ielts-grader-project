"use client";

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  RotateCcw, 
  CheckCircle2, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight, 
  ChevronUp, 
  MapPin, 
  BookOpen, 
  HelpCircle 
} from 'lucide-react';
import { cleanReadingTest1Data, CleanReadingQuestion } from '@/mocks/clean-dataset/reading-test-1-clean';
import { CleanQuestionItemRenderer } from './CleanQuestionItemRenderer';

interface CleanReadingDetailViewProps {
  onRetake: () => void;
}

export function CleanReadingDetailView({ onRetake }: CleanReadingDetailViewProps) {
  const data = cleanReadingTest1Data;
  const [activePassageIndex, setActivePassageIndex] = useState(0);
  const [highlightedEvidenceText, setHighlightedEvidenceText] = useState<string | null>(null);

  const passageScrollRef = useRef<HTMLDivElement>(null);
  const currentPassage = data.passages[activePassageIndex];

  // Danh sách câu hỏi thuộc passage hiện tại
  const currentPassageQuestions = data.questions.filter(
    q => q.passage_number === activePassageIndex + 1
  );

  // Danh sách các nhóm bài tập (Question Groups) thuộc passage hiện tại
  const currentExerciseGroups = data.exercise_groups.filter(
    eg => eg.passage_number === activePassageIndex + 1
  );

  // Số câu đúng của từng passage để hiển thị trên bottom bar
  const getPassageScoreText = (passageNum: number) => {
    const qList = data.questions.filter(q => q.passage_number === passageNum);
    const correctCount = qList.filter(q => q.is_correct).length;
    return `${correctCount}/${qList.length} Questions`;
  };

  // Tự động cuộn đến vị trí đoạn văn khi người dùng click vào từ khóa đối chiếu
  const handleSelectEvidence = (originalText: string) => {
    setHighlightedEvidenceText(originalText);
    if (!passageScrollRef.current) return;

    // Tìm phần tử chứa text
    const elements = passageScrollRef.current.querySelectorAll('[data-evidence-text]');
    for (const el of Array.from(elements)) {
      if (el.textContent && el.textContent.toLowerCase().includes(originalText.toLowerCase())) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        break;
      }
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-100 overflow-hidden">
      {/* 1. TOP BAR: MoonLab Branding, Làm lại, Hoàn thành, 3-dots */}
      <header className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-2xs shrink-0 z-20">
        {/* Left: Back button + MoonLab Logo */}
        <div className="flex items-center gap-3">
          <Link 
            href={`/test-practice/reading/${data.test_id}/summary`}
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900 border border-zinc-200"
            title="Quay lại màn hình tóm tắt"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          {/* Logo MoonLab Hiện Đại (Không dùng logo PREP) */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-base shadow-xs">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-zinc-900 leading-none">
                MoonLab
              </span>
              <span className="text-[10px] text-zinc-400 font-medium tracking-wider">
                IELTS GRADER
              </span>
            </div>
          </div>
        </div>

        {/* Right: Nút Làm lại, Hoàn thành, 3-dots */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRetake}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full border border-blue-200 hover:border-blue-400 text-blue-700 bg-blue-50/50 hover:bg-blue-100/60 font-semibold text-xs md:text-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Làm lại</span>
          </button>

          <Link
            href={`/test-practice/reading/${data.test_id}/summary`}
            className="px-5 py-1.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm shadow-xs transition-colors"
          >
            Hoàn thành
          </Link>

          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800 transition-colors"
            title="Tùy chọn khác"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. MAIN CONTENT: Split View 50% Left (Passage) / 50% Right (Questions + Dropdown) */}
      <div className="flex-1 flex overflow-hidden">
        {/* CỘT TRÁI: READING PASSAGE & HIGHLIGHTS */}
        <div 
          ref={passageScrollRef}
          className="w-1/2 h-full overflow-y-auto bg-white p-6 md:p-8 border-r border-zinc-200 space-y-5"
        >
          {/* Header Passage */}
          <div className="border-b border-zinc-200 pb-4">
            <h2 className="text-base md:text-lg font-black uppercase tracking-wider text-zinc-900">
              READING PASSAGE {activePassageIndex + 1}
            </h2>
            <h3 className="text-lg md:text-xl font-bold text-center text-zinc-900 mt-2 font-serif">
              {currentPassage.title}
            </h3>
          </div>

          {/* Paragraphs */}
          <div className="space-y-4 text-zinc-800 text-sm md:text-base leading-relaxed font-sans">
            {currentPassage.paragraphs && currentPassage.paragraphs.length > 0 ? (
              currentPassage.paragraphs.map((p, pIdx) => {
                const pText = p.text;
                // Kiểm tra xem đoạn văn này có chứa câu bằng chứng nào không
                const matchingQuestions = currentPassageQuestions.filter(
                  q => q.evidence_text && pText.includes(q.evidence_text.slice(0, 30))
                );

                return (
                  <p 
                    key={p.id || pIdx} 
                    data-evidence-text={pText}
                    className="leading-relaxed relative"
                  >
                    {/* Nếu đoạn văn chứa bằng chứng câu 1 (Image 1, 2) */}
                    {matchingQuestions.length > 0 ? (
                      <span>
                        <span className="inline-flex items-center text-red-500 mr-1" title="Vị trí chứa đáp án câu hỏi">
                          📍
                        </span>
                        {pText}
                      </span>
                    ) : (
                      pText
                    )}
                  </p>
                );
              })
            ) : (
              <div className="whitespace-pre-wrap">{currentPassage.content}</div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: USER SCORE CARD + QUESTION GROUPS (GIỐNG HỆT ĐỀ BÀI) */}
        <div className="w-1/2 h-full overflow-y-auto bg-zinc-50/60 p-5 md:p-6 space-y-5">
          {/* USER SCORE CARD (Image 3) */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 md:p-5 flex items-center justify-between shadow-2xs">
            {/* Left: User Avatar + Name + Submission Date */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xs">
                <span className="font-bold text-lg">L</span>
              </div>
              <div>
                <h4 className="font-bold text-base text-zinc-900">long</h4>
                <p className="text-xs text-zinc-500">
                  Ngày làm bài {data.submitted_at}
                </p>
              </div>
            </div>

            {/* Right: Điểm + Câu hỏi đúng */}
            <div className="flex items-center gap-6 md:gap-8">
              <div className="text-right">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Điểm
                </div>
                <div className="text-2xl font-black text-blue-600">
                  {data.overall_band.toFixed(1)}
                </div>
              </div>

              <div className="text-right border-l border-zinc-200 pl-6 md:pl-8">
                <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                  Câu hỏi đúng
                </div>
                <div className="text-2xl font-black text-emerald-600">
                  {data.correct_count}
                  <span className="text-sm font-semibold text-zinc-400 ml-0.5">
                    /{data.total_questions}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* QUESTION GROUPS (Bố cục chuẩn đề thi thật - Image 3) */}
          {currentExerciseGroups.map((group, gIdx) => {
            // Lọc các câu hỏi thuộc nhóm bài tập này
            const groupQuestions = currentPassageQuestions.filter(
              q => q.question_number >= group.question_start && q.question_number <= group.question_end
            );

            return (
              <div key={group.id || gIdx} className="space-y-4">
                {/* QUESTION GROUP INSTRUCTION BOX (Image 3) */}
                <div className="bg-white rounded-xl border border-blue-100 p-4 shadow-2xs space-y-2">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                      ?
                    </div>
                    <span>Questions {group.question_start} - {group.question_end}</span>
                  </div>

                  <p className="text-xs md:text-sm font-semibold text-zinc-800">
                    {group.title}
                  </p>

                  {group.content && (
                    <div className="p-3 bg-zinc-50 rounded-lg border border-zinc-200 font-mono text-xs whitespace-pre-wrap text-zinc-700 leading-relaxed">
                      {group.content}
                    </div>
                  )}
                </div>

                {/* DANH SÁCH CÂU HỎI TRONG GROUP KÈM DROPDOWN MENU DƯỚI MỖI CÂU */}
                <div className="space-y-3.5">
                  {groupQuestions.map((q, qIdx) => (
                    <CleanQuestionItemRenderer
                      key={q.id}
                      question={q}
                      onSelectEvidence={handleSelectEvidence}
                      defaultExpanded={q.question_number === 1} // Mặc định mở câu 1 như trong ảnh mẫu
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. BOTTOM NAVIGATION BAR: Passage Tabs (Không có Bee AI widget) */}
      <footer className="bg-white border-t border-zinc-200 px-4 py-2.5 flex items-center justify-between shrink-0 shadow-xs z-20">
        {/* Left: Button Scroll Up + Prev Passage */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="w-9 h-9 rounded-full bg-zinc-900 text-white flex items-center justify-center hover:bg-zinc-800 transition-colors shadow-xs"
            title="Cuộn lên đầu trang"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            disabled={activePassageIndex === 0}
            onClick={() => setActivePassageIndex(prev => Math.max(0, prev - 1))}
            className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Đoạn văn trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Tabs Passages (Image 1 & 2) */}
        <div className="flex items-center gap-3 overflow-x-auto py-1">
          {data.passages.map((p, idx) => {
            const isActive = activePassageIndex === idx;
            return (
              <button
                key={p.id || idx}
                type="button"
                onClick={() => setActivePassageIndex(idx)}
                className={`px-5 py-2 rounded-xl text-left transition-all border ${
                  isActive
                    ? 'border-blue-600 bg-white shadow-xs text-blue-900'
                    : 'border-zinc-200 bg-zinc-50 hover:bg-white text-zinc-600'
                }`}
              >
                <div className={`font-bold text-xs uppercase tracking-wider ${isActive ? 'text-blue-600' : 'text-zinc-700'}`}>
                  READING PASSAGE {idx + 1}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">
                  {getPassageScoreText(idx + 1)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Right: Next Passage */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={activePassageIndex === data.passages.length - 1}
            onClick={() => setActivePassageIndex(prev => Math.min(data.passages.length - 1, prev + 1))}
            className="w-9 h-9 rounded-lg border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Đoạn văn tiếp theo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </footer>
    </div>
  );
}
