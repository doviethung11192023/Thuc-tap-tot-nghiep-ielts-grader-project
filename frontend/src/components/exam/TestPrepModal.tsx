"use client";

import React, { useState, useEffect } from 'react';
import { X, Clock, Settings, BookOpen, Headphones, PenTool, Mic, Lock, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { prefetchExamContent } from '@/services/exam-content-cache';
import { getLearnerExpertQuota } from '@/services/expert';
import type { LearnerQuota } from '@/types';

interface TestPrepModalProps {
  testId: string;
  testTitle: string;
  skill: 'Reading' | 'Listening' | 'Writing' | 'Speaking';
  allowedMode?: 'practice' | 'mock' | 'both';
  durationMin?: number;
  returnUrl?: string;
  onClose: () => void;
}

const getAllParts = (s: string) => (s === 'Listening' ? [1, 2, 3, 4] : s === 'Reading' ? [1, 2, 3] : [1, 2]);

export function TestPrepModal({ testId, testTitle, skill, allowedMode = 'both', durationMin, returnUrl, onClose }: TestPrepModalProps) {
  const router = useRouter();
  const canPractice = allowedMode !== 'mock';
  const canMock = allowedMode !== 'practice';
  const [selectedMode, setSelectedMode] = useState<'exam' | 'practice'>(canPractice ? 'practice' : 'exam');
  const mode: 'exam' | 'practice' = !canPractice ? 'exam' : !canMock ? 'practice' : selectedMode;
  const [selectedParts, setSelectedParts] = useState<number[]>(() => getAllParts(skill));
  const [quota, setQuota] = useState<LearnerQuota | null>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (skill === 'Writing' || skill === 'Speaking') {
      getLearnerExpertQuota().then(setQuota).catch(() => {});
    }
  }, [skill]);

  useEffect(() => {
    if (testId) prefetchExamContent(testId);
  }, [testId]);

  const togglePart = (partNum: number) => {
    setSelectedParts((prev) => (prev.includes(partNum) ? prev.filter((p) => p !== partNum) : [...prev, partNum].sort()));
  };

  const handleStart = () => {
    const s = skill.toLowerCase();
    const effectiveMode = !canPractice ? 'exam' : !canMock ? 'practice' : mode;
    const partsParam = (effectiveMode === 'exam' ? getAllParts(skill) : selectedParts).join(',');
    const base = s === 'speaking' ? `/test-practice/${s}/${testId}?mode=${effectiveMode}` : `/test-practice/${s}/${testId}?mode=${effectiveMode}&parts=${partsParam}`;
    router.push(returnUrl ? `${base}&returnUrl=${encodeURIComponent(returnUrl)}` : base);
  };

  const SkillIcon = skill === 'Listening' ? Headphones : skill === 'Writing' ? PenTool : skill === 'Speaking' ? Mic : BookOpen;
  const isLR = skill === 'Reading' || skill === 'Listening';
  const estMinutes = skill === 'Writing'
    ? (selectedParts.length === 1 && selectedParts[0] === 2 ? '40 phút' : selectedParts.length === 1 && selectedParts[0] === 1 ? '20 phút' : '60 phút')
    : skill === 'Speaking' ? `${durationMin || 14} phút` : skill === 'Listening' ? '30 phút' : `${selectedParts.length * 20} phút`;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Chuẩn bị làm bài ${testTitle}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2.5 truncate pr-4">
            <SkillIcon className="w-5 h-5 text-[#932120] shrink-0" />
            <h3 className="font-bold text-lg text-zinc-900 truncate">{testTitle}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" className="text-zinc-400 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 p-1.5 rounded-full transition-colors shrink-0 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="space-y-2.5">
            <label className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#932120]" /> Chế độ làm bài
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!canPractice}
                onClick={() => canPractice && setSelectedMode('practice')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  !canPractice ? 'border-zinc-200 bg-zinc-100/80 opacity-60 cursor-not-allowed'
                    : mode === 'practice' ? 'border-[#932120] bg-red-50/50 cursor-pointer' : 'border-zinc-200 hover:border-zinc-300 bg-white cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h4 className={`font-bold text-sm ${mode === 'practice' && canPractice ? 'text-[#932120]' : 'text-zinc-700'}`}>Luyện tập (Practice)</h4>
                  {!canPractice ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded font-bold shrink-0"><Lock className="w-2.5 h-2.5" /> Khóa</span>
                  ) : isLR ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-bold shrink-0"><Sparkles className="w-2.5 h-2.5" /> AI Tutor</span>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {!canPractice ? 'Đề thi này chỉ mở chế độ Phòng thi chuẩn (Mock Test).'
                    : isLR ? 'Đếm tiến, chọn phần tự do, có Trợ lý MoonBot AI hướng dẫn gợi ý.'
                    : 'Đếm tiến, tự do chọn phần. Nhận điểm AI chi tiết, có thể gửi Chuyên gia.'}
                </p>
              </button>

              <button
                type="button"
                disabled={!canMock}
                onClick={() => { if (canMock) { setSelectedMode('exam'); setSelectedParts(getAllParts(skill)); } }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  !canMock ? 'border-zinc-200 bg-zinc-100/80 opacity-60 cursor-not-allowed'
                    : mode === 'exam' ? 'border-[#932120] bg-red-50/50 cursor-pointer' : 'border-zinc-200 hover:border-zinc-300 bg-white cursor-pointer'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <h4 className={`font-bold text-sm ${mode === 'exam' && canMock ? 'text-[#932120]' : 'text-zinc-700'}`}>Thi thử (Mock Test)</h4>
                  {!canMock ? (
                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-zinc-200 text-zinc-600 px-1.5 py-0.5 rounded font-bold shrink-0"><Lock className="w-2.5 h-2.5" /> Khóa</span>
                  ) : (skill === 'Writing' || skill === 'Speaking') && quota?.can_reserve_mock ? (
                    <span className="text-[10px] bg-rose-100 text-[#932120] px-1.5 py-0.5 rounded font-bold shrink-0">Bảo lưu Expert</span>
                  ) : null}
                </div>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  {!canMock ? 'Đề thi này chỉ mở chế độ Luyện tập (Practice).'
                    : (skill === 'Writing' || skill === 'Speaking') ? `Đếm ngược chuẩn thi thật. Bảo lưu suất Chuyên gia (Còn ${quota?.mock_remaining ?? 2}/2 tuần này).`
                    : 'Đếm ngược chuẩn thi thật (BR-12). Hết giờ tự nộp, không dùng AI Tutor.'}
                </p>
              </button>
            </div>
            {!canPractice && isLR && (
              <p className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                Đề này được Admin dành riêng cho Thi thử chuẩn BR-12. Nếu muốn luyện kèm <strong>MoonBot AI</strong>, hãy chọn đề có nhãn <strong>Luyện tập + AI</strong>.
              </p>
            )}
          </div>

          {(skill === 'Reading' || skill === 'Listening' || skill === 'Writing') && (
            <div className="space-y-2.5 pt-1">
              <label className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#932120]" /> Chọn phần muốn làm
              </label>
              {mode === 'exam' ? (
                <div className="bg-red-50/70 border border-red-200 rounded-xl p-3 flex items-center justify-between text-xs text-red-950">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#932120]" />
                    <span><strong>Chế độ phòng thi:</strong> Toàn bộ {skill === 'Reading' ? '3 Passages' : skill === 'Listening' ? '4 Sections' : '2 Tasks (Task 1 & Task 2)'}</span>
                  </div>
                  <span className="font-bold text-[#932120] bg-white px-2 py-0.5 rounded border border-red-200 uppercase text-[10px]">Full Test</span>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    {getAllParts(skill).map((part) => (
                      <button
                        type="button"
                        key={part}
                        onClick={() => togglePart(part)}
                        className={`flex-1 py-2.5 rounded-lg border text-xs md:text-sm font-bold transition-colors cursor-pointer ${
                          selectedParts.includes(part) ? 'bg-[#932120] text-white border-[#932120]' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {skill === 'Reading' ? `Passage ${part}` : skill === 'Listening' ? `Sec ${part}` : `Task ${part}`}
                      </button>
                    ))}
                  </div>
                  {selectedParts.length === 0 && <p className="text-xs text-red-500 font-medium">Vui lòng chọn ít nhất 1 phần để làm bài.</p>}
                </>
              )}
            </div>
          )}

          <div className="bg-red-50 border border-red-200/70 rounded-xl p-3 flex items-center gap-3 text-sm text-[#932120]">
            <Clock className="w-5 h-5 shrink-0 text-[#932120]" />
            <p>Thời gian {mode === 'exam' ? 'giới hạn' : 'khuyến nghị'}: <strong className="font-bold">{estMinutes}</strong></p>
          </div>
        </div>

        <div className="p-5 border-t border-zinc-100 bg-zinc-50 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer">
            Hủy bỏ
          </button>
          <button type="button" onClick={handleStart} disabled={(skill === 'Reading' || skill === 'Listening' || skill === 'Writing') && mode === 'practice' && selectedParts.length === 0} className="px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold text-white bg-[#932120] hover:bg-[#7a1a19] shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 cursor-pointer">
            {mode === 'exam' ? 'Vào phòng Thi thử' : 'Vào phòng Luyện tập'}
          </button>
        </div>
      </div>
    </div>
  );
}
