"use client";

import React, { useState } from 'react';
import { AlertCircle, Volume2, Info } from 'lucide-react';
import { DetailedQuestionResult } from '@/mocks/exam-speaking';

interface SpeakingImprovementsTabProps {
  data: DetailedQuestionResult;
  activePill: string;
  onPillChange: (pill: string) => void;
}

export const SpeakingImprovementsTab: React.FC<SpeakingImprovementsTabProps> = ({
  data,
  activePill,
  onPillChange,
}) => {
  const [selectedWord, setSelectedWord] = useState<string>('gratitude');

  const handleSpeakStandard = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="space-y-5">
      {/* Horizontal Filter Pills Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => onPillChange('lexical_errors')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'lexical_errors'
              ? 'bg-red-600 text-white border-red-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="font-mono mr-1">0</span> Lexical errors
        </button>

        <button
          onClick={() => onPillChange('grammar')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'grammar'
              ? 'bg-red-600 text-white border-red-600 shadow-xs'
              : 'bg-red-50/60 text-red-700 border-red-200 hover:bg-red-100'
          }`}
        >
          <span className="font-mono mr-1">1</span> Grammatical errors
        </button>

        <button
          onClick={() => onPillChange('pronunciation_improve')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'pronunciation_improve'
              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
              : 'bg-amber-50/60 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <span className="font-mono mr-1">19</span> Pronunciation improvement
        </button>

        <button
          onClick={() => onPillChange('word_stress_improve')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'word_stress_improve'
              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
              : 'bg-amber-50/60 text-amber-700 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <span className="font-mono mr-1">2</span> Word stress improvement
        </button>
      </div>

      {/* 1. Grammar Errors Panel (20.png) */}
      {activePill === 'grammar' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900">
              Bạn có 1 lỗi ngữ pháp trong bài
            </h4>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1 text-red-600">
                <span className="w-2 h-2 rounded-full bg-red-600"></span> Lỗi
              </span>
              <span className="flex items-center gap-1 text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Cần cải thiện
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition-colors">
            <Info className="w-3.5 h-3.5" />
            <span>Nếu mắc lỗi ngữ pháp, điểm của bạn bị ảnh hưởng như thế nào?</span>
          </div>

          {/* Grammar Error Card */}
          {data.grammar_errors.map((err) => (
            <div
              key={err.id}
              className="bg-red-50/40 rounded-3xl p-5 border-2 border-red-200 space-y-3 shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-red-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                  {err.id}
                </span>
                <span className="text-sm font-bold text-red-800">
                  {err.title}
                </span>
              </div>

              <div className="space-y-1 text-xs text-slate-700 pl-9">
                <div>
                  <span className="font-bold text-slate-900">Phân loại: </span>
                  <span className="font-semibold text-slate-800">{err.category}</span>
                </div>
                <div className="text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-900">Giải thích: </span>
                  {err.explanation}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 2. Pronunciation Improvements Panel (21.png) */}
      {activePill === 'pronunciation_improve' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Bạn có 19 từ phát âm chưa tốt
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition-colors">
              <Info className="w-3.5 h-3.5" />
              <span>Nếu mắc lỗi phát âm từ đơn lẻ, điểm của bạn sẽ bị ảnh hưởng như thế nào?</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {data.pronunciation_improvements.map((item, idx) => {
              const isExpanded = selectedWord === item.word;

              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border-2 border-amber-200/80 overflow-hidden shadow-2xs"
                >
                  <div
                    onClick={() => setSelectedWord(isExpanded ? '' : item.word)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-amber-50/40 transition-colors"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-bold text-slate-800">
                        {item.word}
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {item.ipa}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSpeakStandard(item.word);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-xs font-bold hover:bg-blue-100 transition-colors"
                      >
                        <Volume2 className="w-3 h-3" />
                        <span>MoonLab đọc</span>
                      </button>
                    </div>
                  </div>

                  {/* Expanded Syllables Breakdown (21.png) */}
                  {isExpanded && (
                    <div className="p-4 bg-amber-50/30 border-t border-amber-100 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-amber-200/60">
                        <div>Âm tiết</div>
                        <div>Phiên âm</div>
                        <div>Đánh giá</div>
                      </div>

                      <div className="space-y-2">
                        {item.syllables.map((syl, i) => (
                          <div key={i} className="grid grid-cols-3 gap-2 text-xs items-center">
                            <div className="font-semibold text-slate-700">{syl.syllable}</div>
                            <div className="font-mono text-slate-600">{syl.ipa}</div>
                            <div>
                              <span
                                className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                  syl.rating === 'Tốt'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {syl.rating}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Word Stress Improvements Panel (22.png) */}
      {activePill === 'word_stress_improve' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Bạn có 2 từ nhấn trọng âm chưa tốt
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition-colors">
              <Info className="w-3.5 h-3.5" />
              <span>Trọng âm và ngữ điệu ảnh hưởng đến câu trả lời của bạn như thế nào?</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {data.word_stress_improvements.map((ws, idx) => (
              <div
                key={idx}
                className="bg-white rounded-2xl border-2 border-amber-200/80 p-4 space-y-3"
              >
                <div className="flex items-baseline justify-between border-b border-amber-100 pb-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-slate-800">{ws.word}</span>
                    <span className="text-xs font-mono text-slate-400">{ws.ipa}</span>
                  </div>
                  <button
                    onClick={() => handleSpeakStandard(ws.word)}
                    className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>MoonLab đọc</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <div>Âm tiết</div>
                  <div>Trọng âm đúng</div>
                  <div>Cách bạn nhấn</div>
                </div>

                <div className="space-y-1.5">
                  {ws.syllables.map((s, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 text-xs items-center">
                      <div className="font-medium text-slate-700">{s.syllable}</div>
                      <div className="text-slate-700 font-semibold">{s.correctStress}</div>
                      <div className="text-amber-700 font-bold">{s.studentStress}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Lexical Errors (Empty) */}
      {activePill === 'lexical_errors' && (
        <div className="text-center py-10 bg-slate-50 rounded-2xl border border-slate-100 p-6 space-y-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center font-bold">
            ✓
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            Không có lỗi dùng sai từ (Lexical Errors)!
          </h4>
          <p className="text-xs text-slate-500">
            Bạn đã sử dụng từ vựng đúng ngữ cảnh trong câu trả lời này.
          </p>
        </div>
      )}
    </div>
  );
};
