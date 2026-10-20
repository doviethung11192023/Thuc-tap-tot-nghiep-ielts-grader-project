"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Award, 
  CheckCircle2, 
  Clock, 
  Mic, 
  ArrowRight, 
  RotateCcw, 
  ArrowLeft,
  Sparkles,
  TrendingUp,
  FileSearch,
  Activity,
  Headphones
} from 'lucide-react';

interface SpeakingSummaryResultProps {
  testId: string;
  testTitle?: string;
  attemptId?: string;
  overallBand?: number;
  scores?: {
    fc: number;
    lr: number;
    gra: number;
    pr: number;
  };
  performanceByPart?: {
    part1: string;
    part2: string;
    part3: string;
  };
  speechStats?: {
    wpm: number;
    hesitationRate: string;
    duration: string;
  };
  onRetake?: () => void;
}

export const SpeakingSummaryResult: React.FC<SpeakingSummaryResultProps> = ({
  testId,
  testTitle = 'Full Test 1: Saying thank you, Wild animals and Politeness',
  attemptId,
  overallBand = 8.0,
  scores = { fc: 8.0, lr: 8.0, gra: 8.0, pr: 8.0 },
  performanceByPart = { part1: 'Very Good', part2: 'Excellent', part3: 'Very Good' },
  speechStats = { wpm: 135, hesitationRate: '3.2%', duration: '14 phút 15 giây' },
  onRetake,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-4 px-3 sm:px-6">
      {/* Top Banner: Thẻ chứng nhận hoàn thành Speaking & Overall Band đỏ PTIT #932120 */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-50/60 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Giám khảo AI hoàn tất phân tích toàn diện 3 phần thi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              Kết Quả Đánh Giá Bài Thi Speaking
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium">
              {testTitle} • Thời gian nói thực tế: {speechStats.duration}
            </p>
          </div>

          {/* Overall Band Box */}
          <div className="flex flex-col items-center justify-center p-5 bg-gradient-to-br from-red-50 to-amber-50/40 rounded-2xl border border-red-100 min-w-[170px] shadow-2xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">
              Overall Band
            </span>
            <span className="text-5xl font-black text-[#932120] tracking-tight my-1">
              {overallBand.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Very Good User
            </span>
          </div>
        </div>

        {/* 4 Tiêu Chí Điểm Số Speaking FC / LR / GRA / PR (Chuẩn Full test 1 docx) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-zinc-100">
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center">
            <span className="text-[11px] font-bold text-zinc-500 block">Fluency & Coherence</span>
            <span className="text-2xl font-black text-zinc-900 my-0.5 block">{scores.fc.toFixed(1)}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Độ trôi chảy & mạch lạc</span>
          </div>
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center">
            <span className="text-[11px] font-bold text-zinc-500 block">Lexical Resource</span>
            <span className="text-2xl font-black text-zinc-900 my-0.5 block">{scores.lr.toFixed(1)}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Vốn từ vựng chuyên sâu</span>
          </div>
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center">
            <span className="text-[11px] font-bold text-zinc-500 block">Grammatical Range</span>
            <span className="text-2xl font-black text-zinc-900 my-0.5 block">{scores.gra.toFixed(1)}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Ngữ pháp đa dạng</span>
          </div>
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center">
            <span className="text-[11px] font-bold text-zinc-500 block">Pronunciation</span>
            <span className="text-2xl font-black text-[#932120] my-0.5 block">{scores.pr.toFixed(1)}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Phát âm & Trọng âm</span>
          </div>
        </div>
      </div>

      {/* Đánh Giá Hiệu Suất Từng Phần & Chỉ Số Ngữ Âm */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Performance by Part */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span>Đánh giá theo từng phần</span>
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">Speaking Part 1:</span>
              <span className="font-bold text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-50">
                {performanceByPart.part1}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">Speaking Part 2:</span>
              <span className="font-bold text-purple-700 px-2 py-0.5 rounded-md bg-purple-50">
                {performanceByPart.part2}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5">
              <span className="text-zinc-500">Speaking Part 3:</span>
              <span className="font-bold text-emerald-700 px-2 py-0.5 rounded-md bg-emerald-50">
                {performanceByPart.part3}
              </span>
            </div>
          </div>
        </div>

        {/* Chỉ số Tốc độ & Kế hoạch hành động Action Plan */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Chẩn đoán âm học và Kế hoạch cải thiện</span>
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs mb-2">
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-zinc-400 block text-[10px]">Tốc độ nói (WPM):</span>
              <strong className="text-zinc-800 text-sm">{speechStats.wpm} từ/phút</strong>
              <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Chuẩn tự nhiên</span>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
              <span className="text-zinc-400 block text-[10px]">Tỉ lệ ngập ngừng / ừm à:</span>
              <strong className="text-zinc-800 text-sm">{speechStats.hesitationRate}</strong>
              <span className="text-[10px] text-emerald-600 block mt-0.5 font-medium">Rất thấp</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 text-xs text-zinc-600 leading-relaxed">
            <strong className="text-blue-900 block mb-0.5">Action Plan 2 bước:</strong>
            1. Duy trì nhịp thở và độ dài câu trả lời như ở Part 2.<br />
            2. Chú ý hạ giọng ở cuối các câu trần thuật phức tạp trong Part 3 để ngữ điệu mang tính thuyết phục học thuật cao hơn.
          </div>
        </div>
      </div>

      {/* Action Bar: 2 Nút lựa chọn rõ ràng */}
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
            href={`/test-practice/speaking/${testId}`}
            className="h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Luyện tập lại</span>
          </Link>
        </div>

        {/* NÚT CHUYỂN SANG NGHIỆP VỤ XEM KẾT QUẢ CHI TIẾT */}
        <Link
          id="btn-view-detailed-speaking-result"
          href={`/test-practice/speaking/${testId}/detail${attemptId ? `?attemptId=${attemptId}` : ''}`}
          className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
        >
          <FileSearch className="w-4 h-4" />
          <span>Xem Phân Tích Ngữ Âm IPA & Audio Từng Câu</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
