"use client";

import React, { useState } from 'react';
import { ArrowLeft, RotateCcw, Volume2, Play, Award, CheckCircle2, AlertCircle, Mic, Sparkles, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { mockSpeakingExamDataset } from '@/mocks/exam-speaking';

interface SpeakingResultsViewProps {
  onRetake: () => void;
}

export function SpeakingResultsView({ onRetake }: SpeakingResultsViewProps) {
  const result = mockSpeakingExamDataset.grading_result;
  const [activeTab, setActiveTab] = useState<'fc' | 'lr' | 'gra' | 'pr'>('pr');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  return (
    <div className="flex flex-col h-[calc(100vh-4.25rem)] w-full bg-zinc-50 rounded-2xl overflow-hidden shadow-lg border border-zinc-200">
      {/* Top Banner */}
      <div className="bg-white border-b border-zinc-200 px-5 py-2.5 h-14 flex items-center justify-between shadow-xs shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link 
            href="/test-practice" 
            className="w-9 h-9 flex items-center justify-center hover:bg-zinc-100 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                Đã đánh giá xong
              </span>
              <h1 className="font-bold text-zinc-900 text-sm md:text-base">
                Kết Quả IELTS Speaking & Chẩn Đoán Ngữ Âm IPA
              </h1>
            </div>
            <p className="text-[11px] text-zinc-500 hidden sm:block">
              Đánh giá tự động 4 tiêu chí bản ngữ kèm phân tích phát âm từng âm tiết và tốc độ nói chuẩn WPM.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRetake}
            className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 h-9 px-4 rounded-xl text-sm font-bold transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Làm lại bài
          </button>
          <Link
            href="/test-practice"
            className="bg-[#932120] text-white h-9 px-5 rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-xs transition-colors flex items-center justify-center"
          >
            Hoàn tất
          </Link>
        </div>
      </div>

      {/* Results Ribbon */}
      <div className="bg-zinc-900 text-white px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#932120] flex items-center justify-center font-black text-xl text-white shadow-md">
              {result.overall_band.toFixed(1)}
            </div>
            <div>
              <p className="text-xs text-zinc-400 uppercase font-semibold">Overall Band Score</p>
              <p className="text-sm font-bold text-white">IELTS Speaking</p>
            </div>
          </div>

          <div className="h-8 w-px bg-zinc-700 hidden sm:block" />

          <div className="flex items-center gap-3 text-xs sm:text-sm">
            <span className="bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700">
              FC: <strong className="text-white">{result.criteria_scores.fluency_coherence.score.toFixed(1)}</strong>
            </span>
            <span className="bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700">
              LR: <strong className="text-white">{result.criteria_scores.lexical_resource.score.toFixed(1)}</strong>
            </span>
            <span className="bg-zinc-800 px-3 py-1 rounded-lg border border-zinc-700">
              GRA: <strong className="text-white">{result.criteria_scores.grammatical_accuracy.score.toFixed(1)}</strong>
            </span>
            <span className="bg-red-950/60 border border-red-800 px-3 py-1 rounded-lg">
              PR: <strong className="text-red-400">{result.criteria_scores.pronunciation.score.toFixed(1)}</strong>
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsPlayingAudio(!isPlayingAudio)}
          className="flex items-center gap-2 bg-[#932120] hover:bg-red-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md transition-colors"
        >
          <Play className="w-3.5 h-3.5" />
          {isPlayingAudio ? 'Đang phát lại bản ghi...' : 'Nghe lại bản thu âm của bạn'}
        </button>
      </div>

      {/* Main Split Review */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Column: Interactive Speech-to-Text Transcript */}
        <div className="w-1/2 border-r border-zinc-200 bg-white flex flex-col h-full relative">
          <div className="p-4 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between shrink-0">
            <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
              <Mic className="w-4 h-4 text-[#932120]" />
              Bản gỡ băng Speech-to-Text tự động
            </h3>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-red-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-red-500"></span> Lỗi phát âm IPA
              </span>
              <span className="flex items-center gap-1 text-emerald-700 font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Collocation hay
              </span>
            </div>
          </div>

          <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar space-y-6">
            <div className="p-6 bg-zinc-50/60 border border-zinc-200 rounded-2xl font-serif text-lg leading-relaxed text-zinc-800 space-y-4">
              <p>
                Well, I would like to talk about an unforgettable journey that I took two summers ago to the mountainous region of Ha Giang. I went there with a group of close university friends right after our exhausting final examinations. The scenery along the Ma Pi Leng pass was genuinely{' '}
                <mark className="bg-red-100 text-red-900 font-bold px-1 rounded border-b-2 border-red-500 cursor-pointer" title="Lỗi phát âm: /breθˌteɪ.kɪŋ/">
                  breathtaking
                </mark>
                , with emerald rivers winding through towering limestone karsts. However, the motorbike trek was quite demanding because of the steep, winding roads. What made this trip unforgettable was not just the dramatic landscape, but the warmth of the ethnic minority children we encountered in the remote villages. It truly{' '}
                <mark className="bg-emerald-100 text-emerald-900 font-bold px-1 rounded border-b-2 border-emerald-500" title="Collocation C1 tự nhiên">
                  broadened my horizons
                </mark>{' '}
                and offered a peaceful escape from the{' '}
                <mark className="bg-emerald-100 text-emerald-900 font-bold px-1 rounded border-b-2 border-emerald-500" title="Idiom hay">
                  hustle and bustle
                </mark>{' '}
                of city life.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 font-medium">Tốc độ nói (Speech Rate):</span>
                <p className="text-base font-bold text-zinc-900 mt-0.5">
                  {result.criteria_scores.fluency_coherence.words_per_minute} Từ / phút (Tự nhiên)
                </p>
              </div>
              <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl">
                <span className="text-zinc-500 font-medium">Tỷ lệ ngập ngừng (Hesitation):</span>
                <p className="text-base font-bold text-zinc-900 mt-0.5">
                  {result.criteria_scores.fluency_coherence.hesitation_rate_percentage}% (Tốt)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 4 Criteria Breakdown (Focus on IPA Pronunciation) */}
        <div className="w-1/2 flex flex-col h-full bg-zinc-50/70">
          {/* Tabs */}
          <div className="flex border-b border-zinc-200 bg-white shrink-0 p-1">
            {[
              { id: 'pr', label: 'Pronunciation • Ngữ âm IPA' },
              { id: 'fc', label: 'Fluency & Coherence' },
              { id: 'lr', label: 'Lexical Resource' },
              { id: 'gra', label: 'Grammar' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-3 px-2 text-xs font-bold rounded-lg transition-all text-center ${
                  activeTab === tab.id
                    ? 'bg-[#932120] text-white shadow-xs'
                    : 'text-zinc-600 hover:bg-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-6">
            {/* PRONUNCIATION TAB: In-depth IPA Diagnostics */}
            {activeTab === 'pr' && (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-sm text-zinc-900">Tiêu chí Phát âm • Band 6.0</h3>
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2.5 py-1 rounded-lg">
                      Cần cải thiện ngữ âm
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {result.criteria_scores.pronunciation.feedback}
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Chi Tiết Các Từ Cần Sửa Phát Âm:
                  </h4>

                  {result.criteria_scores.pronunciation.phonetic_errors.map((item) => (
                    <div key={item.id} className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                        <span className="text-base font-bold text-zinc-900">
                          Từ: <strong className="text-[#932120]">"{item.word}"</strong>
                        </span>
                        <button
                          onClick={() => alert(`Đang phát âm thanh chuẩn cho từ: ${item.word}`)}
                          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 hover:bg-[#932120] hover:text-white transition-colors text-xs font-bold text-zinc-700"
                        >
                          <Volume2 className="w-3.5 h-3.5" /> Nghe mẫu
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 bg-red-50/50 rounded-xl border border-red-100">
                          <span className="text-zinc-500 font-semibold block">Bạn phát âm:</span>
                          <span className="text-red-700 font-mono font-bold text-sm">{item.student_ipa}</span>
                          <span className="text-[11px] text-red-500 block mt-1">❌ {item.issue}</span>
                        </div>
                        <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                          <span className="text-zinc-500 font-semibold block">Bản ngữ chuẩn (Oxford):</span>
                          <span className="text-emerald-800 font-mono font-bold text-sm">{item.standard_ipa}</span>
                          <span className="text-[11px] text-emerald-600 block mt-1">✓ Chuẩn xác</span>
                        </div>
                      </div>

                      <div className="bg-zinc-50 p-3 rounded-xl border border-zinc-100 text-xs text-zinc-700">
                        <strong>Mẹo luyện tập:</strong> {item.practice_tip}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FLUENCY TAB */}
            {activeTab === 'fc' && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-zinc-900">Fluency & Coherence (Band 6.5)</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {result.criteria_scores.fluency_coherence.feedback}
                </p>
                <div className="space-y-2 pt-2">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-700">
                    ✓ Duy trì luồng nói đều đặn trong 2 phút phần Cue Card.
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-700">
                    ⚠ Cần giảm thiểu từ đệm "um, let me see" khi bắt đầu chuyển ý.
                  </div>
                </div>
              </div>
            )}

            {/* LEXICAL RESOURCE TAB */}
            {activeTab === 'lr' && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-zinc-900">Lexical Resource (Band 7.0)</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {result.criteria_scores.lexical_resource.feedback}
                </p>
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Thành ngữ & Cụm từ hay đã sử dụng:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {result.criteria_scores.lexical_resource.idiomatic_expressions.map((exp, idx) => (
                      <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold">
                        ★ {exp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* GRAMMAR TAB */}
            {activeTab === 'gra' && (
              <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
                <h3 className="font-bold text-base text-zinc-900">Grammatical Accuracy (Band 6.5)</h3>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {result.criteria_scores.grammatical_accuracy.feedback}
                </p>
                <div className="space-y-2 pt-2">
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-700">
                    ✓ Tỷ lệ câu ghép và câu phức đạt 65%.
                  </div>
                  <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 text-xs text-zinc-700">
                    ⚠ Chú ý thì quá khứ đơn đối với các động từ bất quy tắc khi kể lại trải nghiệm.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
