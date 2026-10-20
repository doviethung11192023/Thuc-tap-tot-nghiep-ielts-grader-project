"use client";

import React from 'react';
import Link from 'next/link';
import { 
  Award, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  PenTool, 
  ArrowRight, 
  RotateCcw, 
  ArrowLeft,
  Sparkles,
  TrendingUp,
  FileSearch,
  BookOpen
} from 'lucide-react';

interface WritingSummaryResultProps {
  testId: string;
  testTitle?: string;
  attemptId?: string;
  overallBand?: number;
  scores?: {
    tr: number;
    cc: number;
    lr: number;
    gra: number;
  };
  stats?: {
    timeSpent: string;
    task1WordCount: number;
    task2WordCount: number;
  };
  onRetake?: () => void;
}

export const WritingSummaryResult: React.FC<WritingSummaryResultProps> = ({
  testId,
  testTitle = 'Writing Academic Test',
  attemptId,
  overallBand = 6.5,
  scores = { tr: 6.5, cc: 6.0, lr: 7.0, gra: 6.5 },
  stats = { timeSpent: '54 phút 20 giây', task1WordCount: 172, task2WordCount: 284 },
  onRetake,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 py-4 px-3 sm:px-6">
      {/* Top Banner: Thẻ thông báo hoàn thành & điểm Overall Band chuẩn đỏ PTIT #932120 */}
      <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-red-50/60 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bài thi đã được chấm điểm tự động thành công</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
              Kết Quả Đánh Giá Bài Thi Writing
            </h1>
            <p className="text-xs sm:text-sm text-zinc-500 font-medium">
              {testTitle} • Hoàn thành lúc {stats.timeSpent}
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
              Competent User
            </span>
          </div>
        </div>

        {/* 4 Tiêu Chí Điểm Số Theo Quy Chuẩn Đại Học Cambridge */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-6 pt-6 border-t border-zinc-100">
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center">
            <span className="text-[11px] font-bold text-zinc-500 block">Task Response</span>
            <span className="text-2xl font-black text-zinc-900 my-0.5 block">{scores.tr.toFixed(1)}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Hoàn thành yêu cầu</span>
          </div>
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center">
            <span className="text-[11px] font-bold text-zinc-500 block">Coherence & Cohesion</span>
            <span className="text-2xl font-black text-zinc-900 my-0.5 block">{scores.cc.toFixed(1)}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Mạch lạc & liên kết</span>
          </div>
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center">
            <span className="text-[11px] font-bold text-zinc-500 block">Lexical Resource</span>
            <span className="text-2xl font-black text-[#932120] my-0.5 block">{scores.lr.toFixed(1)}</span>
            <span className="text-[10px] text-emerald-600 font-semibold">Điểm sáng từ vựng</span>
          </div>
          <div className="bg-zinc-50 p-3.5 rounded-2xl border border-zinc-200/80 text-center">
            <span className="text-[11px] font-bold text-zinc-500 block">Grammatical Range</span>
            <span className="text-2xl font-black text-zinc-900 my-0.5 block">{scores.gra.toFixed(1)}</span>
            <span className="text-[10px] text-zinc-400 font-medium">Độ chính xác ngữ pháp</span>
          </div>
        </div>
      </div>

      {/* Thống kê bài làm & Đánh giá tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Số từ và thời gian */}
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Thống kê bài viết</span>
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">Thời gian làm:</span>
              <strong className="text-zinc-800">{stats.timeSpent}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-zinc-100">
              <span className="text-zinc-500">Số từ Task 1:</span>
              <span className="font-bold text-emerald-700">{stats.task1WordCount} từ (Chuẩn ≥ 150)</span>
            </div>
            <div className="flex justify-between py-1.5">
              <span className="text-zinc-500">Số từ Task 2:</span>
              <span className="font-bold text-emerald-700">{stats.task2WordCount} từ (Chuẩn ≥ 250)</span>
            </div>
          </div>
        </div>

        {/* Điểm mạnh & Điểm cần cải thiện */}
        <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs space-y-3">
          <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span>Nhận xét tổng quan và định hướng cải thiện</span>
          </h3>
          <div className="space-y-2.5 text-xs text-zinc-600 leading-relaxed">
            <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100">
              <strong className="text-emerald-800 block mb-0.5">Ưu điểm nổi bật:</strong>
              Bài viết duy trì bố cục 4 đoạn chuẩn xác. Đoạn Overview của Task 1 nêu bật được 2 xu hướng chính; các từ vựng học thuật C1 như &apos;substantial increase&apos;, &apos;predominantly&apos; được sử dụng tự nhiên.
            </div>
            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100">
              <strong className="text-amber-800 block mb-0.5">Điểm cần cải thiện để đạt Band 7.0+:</strong>
              Cần đa dạng hóa cấu trúc câu phức (đảo ngữ, mệnh đề quan hệ rút gọn). Task 2 cần mở rộng thêm luận cứ phản biện (counter-argument) ở đoạn thân bài 2.
            </div>
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
            href={`/test-practice/writing/${testId}`}
            className="h-10 px-4 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center justify-center gap-1.5 transition-all shadow-2xs flex-1 sm:flex-initial"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Làm lại bài</span>
          </Link>
        </div>

        {/* NÚT CHUYỂN SANG NGHIỆP VỤ XEM KẾT QUẢ CHI TIẾT */}
        <Link
          id="btn-view-detailed-writing-result"
          href={`/test-practice/writing/${testId}/detail${attemptId ? `?attemptId=${attemptId}` : ''}`}
          className="w-full sm:w-auto h-10 px-6 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 active:scale-95"
        >
          <FileSearch className="w-4 h-4" />
          <span>Xem Kết Quả Chi Tiết & Chữa Lỗi Câu</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
