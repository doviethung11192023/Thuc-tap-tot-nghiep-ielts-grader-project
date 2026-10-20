"use client";

import React, { useState } from 'react';
import { X, Clock, Settings, BookOpen, Headphones, PenTool, Mic, Eye } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TestPrepModalProps {
  testId: string;
  testTitle: string;
  skill: 'Reading' | 'Listening' | 'Writing' | 'Speaking';
  onClose: () => void;
}

export function TestPrepModal({ testId, testTitle, skill, onClose }: TestPrepModalProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'exam' | 'practice'>('practice');
  const [selectedParts, setSelectedParts] = useState<number[]>([1, 2, 3]);

  const togglePart = (partNum: number) => {
    setSelectedParts(prev => 
      prev.includes(partNum) 
        ? prev.filter(p => p !== partNum)
        : [...prev, partNum].sort()
    );
  };

  const handleStart = () => {
    const partsParam = selectedParts.join(',');
    
    // --- [MÃ MỚI BỞI AGENT: Định tuyến thông minh theo 4 kỹ năng] ---
    let path = '';
    if (skill === 'Writing') {
      path = `/test-practice/writing/${testId}?mode=${mode}`;
    } else if (skill === 'Listening') {
      path = `/test-practice/listening/${testId}?mode=${mode}&parts=${partsParam}`;
    } else if (skill === 'Speaking') {
      path = `/test-practice/speaking/${testId}?mode=${mode}`;
    } else {
      path = `/test-practice/reading/${testId}?mode=${mode}&parts=${partsParam}`;
    }
    // -------------------------------------------------------------

    router.push(path);
  };

  const handlePreviewResults = () => {
    let path = '';
    if (skill === 'Writing') {
      path = `/test-practice/writing/${testId}?view=result`;
    } else if (skill === 'Listening') {
      path = `/test-practice/listening/${testId}?view=result`;
    } else if (skill === 'Speaking') {
      path = `/test-practice/speaking/${testId}?view=result`;
    } else {
      path = `/test-practice/reading/${testId}?view=result`;
    }
    router.push(path);
  };

  const getSkillIcon = () => {
    switch (skill) {
      case 'Listening': return <Headphones className="w-5 h-5 text-[#932120]" />;
      case 'Reading': return <BookOpen className="w-5 h-5 text-[#932120]" />;
      case 'Writing': return <PenTool className="w-5 h-5 text-[#932120]" />;
      case 'Speaking': return <Mic className="w-5 h-5 text-[#932120]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex justify-between items-center p-5 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-2.5 truncate pr-4">
            {getSkillIcon()}
            <h3 className="font-bold text-lg text-zinc-900 truncate">{testTitle}</h3>
          </div>
          <button 
            onClick={onClose} 
            className="text-zinc-400 hover:text-zinc-700 bg-zinc-100 hover:bg-zinc-200 p-1.5 rounded-full transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Mode Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#932120]" /> Chế độ làm bài
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setMode('practice')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode === 'practice' 
                    ? 'border-[#932120] bg-red-50/50' 
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <h4 className={`font-bold mb-1 ${mode === 'practice' ? 'text-[#932120]' : 'text-zinc-700'}`}>
                  Luyện tập
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Thời gian đếm tiến, không giới hạn. Cho phép lưu nháp và thoát tự do.
                </p>
              </button>
              
              <button
                onClick={() => {
                  setMode('exam');
                  setSelectedParts(skill === 'Reading' ? [1, 2, 3] : skill === 'Listening' ? [1, 2, 3, 4] : [1, 2]);
                }}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  mode === 'exam' 
                    ? 'border-[#932120] bg-red-50/50' 
                    : 'border-zinc-200 hover:border-zinc-300 bg-white'
                }`}
              >
                <h4 className={`font-bold mb-1 ${mode === 'exam' ? 'text-[#932120]' : 'text-zinc-700'}`}>
                  Luyện thi
                </h4>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Đếm ngược thời gian. Hết giờ tự động nộp bài. Bắt buộc làm toàn bộ các phần.
                </p>
              </button>
            </div>
          </div>

          {/* Parts Selection for Reading/Listening */}
          {(skill === 'Reading' || skill === 'Listening') && (
            <div className="space-y-3 pt-2">
              <label className="text-sm font-semibold text-zinc-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#932120]" /> Chọn phần muốn làm
              </label>

              {mode === 'exam' ? (
                <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5 flex items-center justify-between text-xs text-red-950">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="w-2 h-2 rounded-full bg-[#932120]"></span>
                    <span><strong>Chế độ phòng thi:</strong> Mặc định làm toàn bộ {skill === 'Reading' ? '3 Passages' : '4 Sections'}, yêu cầu làm đủ các phần</span>
                  </div>
                  <span className="font-bold text-[#932120] bg-white px-2 py-0.5 rounded border border-red-200 uppercase text-[10px]">
                    Full Test
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    {(skill === 'Reading' ? [1, 2, 3] : [1, 2, 3, 4]).map(part => (
                      <button
                        key={part}
                        onClick={() => togglePart(part)}
                        className={`flex-1 py-2.5 rounded-lg border text-xs md:text-sm font-bold transition-colors ${
                          selectedParts.includes(part)
                            ? 'bg-[#932120] text-white border-[#932120]'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                        }`}
                      >
                        {skill === 'Reading' ? `Passage ${part}` : `Sec ${part}`}
                      </button>
                    ))}
                  </div>
                  {selectedParts.length === 0 && (
                    <p className="text-xs text-red-500 font-medium">Vui lòng chọn ít nhất 1 phần để làm bài.</p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Time estimation */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-3 text-sm text-blue-800">
            <Clock className="w-5 h-5 shrink-0 text-blue-500" />
            <p>
              Thời gian {mode === 'exam' ? 'giới hạn' : 'khuyến nghị'}:{' '}
              <strong className="font-bold">
                {skill === 'Writing' ? '60 phút' :
                 skill === 'Speaking' ? '14 phút' :
                 skill === 'Listening' ? '30 phút' :
                 `${selectedParts.length * 20} phút`}
              </strong>
            </p>
          </div>
        </div>

        <div className="p-5 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between gap-3">
          <button 
            type="button"
            onClick={handlePreviewResults}
            className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 shadow-2xs active:scale-95"
          >
            <Eye className="w-4 h-4 text-emerald-600" /> Xem kết quả mẫu
          </button>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors"
            >
              Hủy bỏ
            </button>
            <button 
              onClick={handleStart}
              disabled={(skill === 'Reading' || skill === 'Listening') && selectedParts.length === 0}
              className="px-5 py-2.5 rounded-xl text-xs md:text-sm font-bold text-white bg-[#932120] hover:bg-[#7a1a19] shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              Vào phòng thi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
