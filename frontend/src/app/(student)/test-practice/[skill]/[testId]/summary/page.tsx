"use client";

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { WritingSummaryResult } from '@/components/exam/summary/WritingSummaryResult';
import { SpeakingSummaryResult } from '@/components/exam/summary/SpeakingSummaryResult';
import { 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft, 
  RotateCcw, 
  FileSearch, 
  ArrowRight,
  Clock,
  BookOpen,
  Headphones
} from 'lucide-react';

export default function SkillSummaryResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();

  const skill = (params?.skill as string)?.toLowerCase();
  const testId = params?.testId as string;
  const attemptId = searchParams.get('attemptId') || undefined;

  if (skill === 'writing') {
    return (
      <WritingSummaryResult 
        testId={testId} 
        attemptId={attemptId}
        testTitle="IELTS Academic Writing - Task 1 & Task 2"
      />
    );
  }

  if (skill === 'speaking') {
    return (
      <SpeakingSummaryResult 
        testId={testId} 
        attemptId={attemptId}
        testTitle="Full Test 1: Saying thank you, Wild animals and Politeness"
      />
    );
  }

  // Màn hình tóm tắt cho Reading & Listening (Đồng bộ chuẩn 3 tầng)
  const isReading = skill === 'reading';
  const skillTitle = isReading ? 'Reading' : 'Listening';
  const bandScore = isReading ? 6.5 : 6.0;
  const correctCount = isReading ? 26 : 24;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-4 px-3 sm:px-6">
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Đã hoàn thành và ghi nhận kết quả bài thi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              Kết Quả Bài Thi {skillTitle}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium">
              Đề thi Cambridge IELTS 18 • Thời gian làm bài: {isReading ? '52 phút' : '28 phút'}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-red-50 to-amber-50/40 rounded-2xl border border-red-100 min-w-[170px] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Band Score
            </span>
            <span className="text-5xl font-black text-[#932120] tracking-tight my-1">
              {bandScore.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              {correctCount}/40 câu đúng
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3.5 mt-6 pt-6 border-t border-zinc-100 text-center">
          <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-200 text-emerald-800">
            <span className="text-xs font-bold block">Số câu đúng</span>
            <span className="text-2xl font-black block mt-0.5">{correctCount}</span>
          </div>
          <div className="bg-red-50/70 p-3.5 rounded-2xl border border-red-200 text-red-800">
            <span className="text-xs font-bold block">Số câu sai</span>
            <span className="text-2xl font-black block mt-0.5">{40 - correctCount}</span>
          </div>
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200 text-zinc-700">
            <span className="text-xs font-bold block">Độ chính xác</span>
            <span className="text-2xl font-black block mt-0.5">{((correctCount / 40) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-zinc-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link
            href="/test-practice"
            className="h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về danh sách đề</span>
          </Link>
          <Link
            href={`/test-practice/${skill}/${testId}`}
            className="h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Làm lại bài</span>
          </Link>
        </div>

        <Link
          id={`btn-view-detailed-${skill}-result`}
          href={`/test-practice/${skill}/${testId}/detail${attemptId ? `?attemptId=${attemptId}` : ''}`}
          className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
        >
          <FileSearch className="w-4 h-4" />
          <span>Xem Lời Giải & Phân Tích Chi Tiết</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
