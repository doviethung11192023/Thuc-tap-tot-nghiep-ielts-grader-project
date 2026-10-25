"use client";

import React, { useState } from 'react';
import { Volume2, Info, ChevronRight, Check } from 'lucide-react';
import { DetailedQuestionResult, CollocationItem, PronunciationWordItem } from '@/mocks/exam-speaking';

interface SpeakingStrengthsTabProps {
  data: DetailedQuestionResult;
  activePill: string;
  onPillChange: (pill: string) => void;
  selectedKeyword?: string | null;
}

export const SpeakingStrengthsTab: React.FC<SpeakingStrengthsTabProps> = ({
  data,
  activePill,
  onPillChange,
  selectedKeyword,
}) => {
  const [selectedWord, setSelectedWord] = useState<string>('Expressing');

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
          onClick={() => onPillChange('collocations')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'collocations'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="font-mono mr-1">13</span> Collocations
        </button>

        <button
          onClick={() => onPillChange('topic')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'topic'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="font-mono mr-1">0</span> Topic specific words
        </button>

        <button
          onClick={() => onPillChange('linking')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'linking'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="font-mono mr-1">2</span> Linking devices
        </button>

        <button
          onClick={() => onPillChange('complex')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'complex'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="font-mono mr-1">1</span> Complex structures
        </button>

        <button
          onClick={() => onPillChange('pronunciation_good')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'pronunciation_good'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="font-mono mr-1">47</span> Good pronunciation
        </button>

        <button
          onClick={() => onPillChange('word_stress_good')}
          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
            activePill === 'word_stress_good'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <span className="font-mono mr-1">64</span> Good word stress
        </button>
      </div>

      {/* 1. Collocations Panel */}
      {activePill === 'collocations' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Bạn sử dụng được 13 collocations trong bài
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition-colors">
              <Info className="w-3.5 h-3.5" />
              <span>Tại sao collocations tốt cho bài của bạn?</span>
            </div>
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {data.collocations.map((item) => {
              const isSelected = selectedKeyword === item.phrase || item.id === 1;

              return (
                <div
                  key={item.id}
                  className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                      {item.id}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      {item.phrase}
                    </span>
                  </div>

                  <button
                    onClick={() => handleSpeakStandard(item.phrase.replace(/-/g, ' '))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-bold transition-colors shrink-0"
                    title="Nghe AI phát âm mẫu"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>MoonLab đọc</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Topic Specific Words Panel */}
      {activePill === 'topic' && (
        <div className="text-center py-10 space-y-3 bg-slate-50/60 rounded-3xl border border-slate-100 p-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 mx-auto flex items-center justify-center text-xl">
            💡
          </div>
          <h4 className="text-sm font-bold text-slate-800">
            Rất tiếc, bạn chưa áp dụng được topic specific word nào trong bài. Cố gắng cải thiện trong những bài sau nhé!
          </h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Từ Band 7 trở lên, bạn cần nguồn từ vựng đủ lớn để nói về các chủ điểm khác nhau một cách linh hoạt.
          </p>
        </div>
      )}

      {/* 3. Linking Devices Panel */}
      {activePill === 'linking' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Bạn sử dụng được 2 linking devices trong bài
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition-colors">
              <Info className="w-3.5 h-3.5" />
              <span>Bạn nên sử dụng các phương tiện liên kết trong bài luận như thế nào?</span>
            </div>
          </div>

          <div className="space-y-2">
            {data.linking_devices.map((ld, i) => (
              <div
                key={i}
                className="p-3.5 rounded-2xl bg-white border border-slate-200/80 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm font-bold text-slate-800">{ld}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. Complex Structures Panel (12.png) */}
      {activePill === 'complex' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Bạn sử dụng được 1 complex structure trong bài
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition-colors">
              <Info className="w-3.5 h-3.5" />
              <span>Nên sử dụng cấu trúc phức thế nào cho hiệu quả?</span>
            </div>
          </div>

          {data.complex_structures.map((cs) => (
            <div
              key={cs.id}
              className="bg-emerald-50/40 rounded-3xl p-5 border border-emerald-200/80 space-y-4 shadow-2xs"
            >
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {cs.id}
                </span>
                <p className="text-xs sm:text-sm font-medium text-slate-800 leading-relaxed">
                  {cs.sentence}
                </p>
              </div>

              <div className="space-y-3 pt-2">
                {cs.clauses.map((clause, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-3.5 rounded-2xl border border-slate-200/70 space-y-1 text-xs"
                  >
                    <div className="font-bold text-slate-800 flex items-center gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{clause.keyword}</span>
                    </div>
                    <div className="text-slate-600 font-medium">
                      Phân loại: <span className="text-slate-800 font-semibold">{clause.type}</span>
                    </div>
                    <div className="text-slate-500 leading-relaxed">
                      Giải thích: {clause.explanation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Good Pronunciation Panel (13.png, 14.png) */}
      {activePill === 'pronunciation_good' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Bạn có 47 từ phát âm tốt trong bài
            </h4>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer hover:text-blue-600 transition-colors">
              <Info className="w-3.5 h-3.5" />
              <span>Nếu mắc lỗi phát âm từ đơn lẻ, điểm của bạn sẽ bị ảnh hưởng như thế nào?</span>
            </div>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {data.good_pronunciation.map((item, idx) => {
              const isExpanded = selectedWord === item.word;

              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs"
                >
                  <div
                    onClick={() => setSelectedWord(isExpanded ? '' : item.word)}
                    className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs sm:text-sm font-bold text-slate-800">
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

                  {/* Expanded Syllable Table (14.png) */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50/70 border-t border-slate-100 space-y-3 animate-fade-in">
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-200">
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

      {/* 6. Good Word Stress Panel (16.png) */}
      {activePill === 'word_stress_good' && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900">
              Bạn có 64 từ nhấn trọng âm tốt trong bài
            </h4>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {data.good_word_stress.map((ws, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 p-4 space-y-3">
                <div className="flex items-baseline justify-between border-b border-slate-100 pb-2">
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
                      <div className="text-slate-600">{s.correctStress}</div>
                      <div className="text-emerald-700 font-semibold">{s.studentStress}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
