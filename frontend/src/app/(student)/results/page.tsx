"use client";

import React, { useState } from "react";
import { EssayHighlighter, HighlightLegend } from "@/components/workspace/EssayHighlighter";
import type { Highlight } from "@/components/workspace/EssayHighlighter";
import { BookOpen, ChevronLeft, ChevronRight, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import mockData from "@/data/mock_essays.json";

// ────────────────────────────────────────────────────────────
// TYPES — khớp với mock_essays.json
// ────────────────────────────────────────────────────────────
interface MockEssay {
  essay_id: number;
  topic: string;
  essay_type: string;
  prompt: string;
  word_count: number;
  content: string;
  highlights: Highlight[];
  scores: {
    overall_band: number;
    task_response_score: number;
    coherence_cohesion_score: number;
    lexical_resource_score: number;
    grammar_accuracy_score: number;
  };
  structure: {
    thesis: string | null;
    arguments: Array<{ main: string; supporting: string[] }>;
    total_main_ideas: number;
  };
}

const essays = mockData as MockEssay[];

// ────────────────────────────────────────────────────────────
// MAIN PAGE
// ────────────────────────────────────────────────────────────
export default function ResultsPage() {
  const [idx, setIdx] = useState(0);
  const essay = essays[idx];

  const grammarErrors = essay.highlights.filter((h) => h.type === "grammar_error");
  const structureNodes = essay.highlights.filter((h) => h.type !== "grammar_error");

  return (
    <div className="min-h-screen bg-zinc-50 font-sans">
      {/* Top Bar */}
      <header className="bg-white border-b border-zinc-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-[#932120] p-2 rounded-lg">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-zinc-800">Essay Result</h1>
            <p className="text-xs text-zinc-500">{essay.topic} · {essay.essay_type}</p>
          </div>
        </div>

        {/* Essay navigator — để xem các bài mock khác nhau */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">
            Bài {idx + 1} / {essays.length}
          </span>
          <button
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            disabled={idx === 0}
            className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIdx((i) => Math.min(essays.length - 1, i + 1))}
            disabled={idx === essays.length - 1}
            className="p-1.5 rounded-lg hover:bg-zinc-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 flex gap-6">
        {/* ── LEFT: Essay với highlight ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Prompt */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-1.5">Đề bài</p>
            <p className="text-sm text-amber-900 leading-relaxed">{essay.prompt}</p>
          </div>

          {/* Legend */}
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">Chú thích màu</p>
            <HighlightLegend />
          </div>

          {/* Essay text với highlight */}
          <div className="bg-white rounded-xl border border-zinc-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-zinc-800">Bài viết</h2>
              <span className="text-xs text-zinc-500 bg-zinc-100 px-3 py-1 rounded-full font-medium">
                {essay.word_count} từ
              </span>
            </div>
            <EssayHighlighter
              content={essay.content}
              highlights={essay.highlights}
            />
          </div>
        </div>

        {/* ── RIGHT: Sidebar ── */}
        <div className="w-[320px] shrink-0 space-y-4">
          {/* Overall Score */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 text-center">
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">
              Overall Band Score
            </p>
            <div className="text-6xl font-black text-[#932120]">
              {essay.scores.overall_band.toFixed(1)}
            </div>
          </div>

          {/* Criteria Scores */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
            <h3 className="font-bold text-zinc-800 text-sm">Chi tiết 4 tiêu chí</h3>
            <CriteriaBar label="Task Response" score={essay.scores.task_response_score} />
            <CriteriaBar label="Coherence & Cohesion" score={essay.scores.coherence_cohesion_score} />
            <CriteriaBar label="Lexical Resource" score={essay.scores.lexical_resource_score} />
            <CriteriaBar label="Grammar" score={essay.scores.grammar_accuracy_score} />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              icon={<AlertCircle className="w-4 h-4 text-red-500" />}
              value={grammarErrors.length}
              label="Lỗi ngữ pháp"
              valueClass="text-red-600"
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
              value={structureNodes.length}
              label="Nodes cấu trúc"
              valueClass="text-green-600"
            />
          </div>

          {/* Grammar Error List */}
          {grammarErrors.length > 0 && (
            <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
              <h3 className="font-bold text-zinc-800 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                Lỗi cần sửa ({grammarErrors.length})
              </h3>
              <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                {grammarErrors.slice(0, 8).map((err) => (
                  <div
                    key={err.id}
                    className="p-3 rounded-lg border border-red-100 bg-red-50/60 text-xs"
                  >
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="line-through text-red-600 font-semibold">
                        {err.original_text}
                      </span>
                      {err.corrected_text && (
                        <>
                          <span className="text-zinc-400">→</span>
                          <span className="text-green-700 font-semibold">{err.corrected_text}</span>
                        </>
                      )}
                    </div>
                    <p className="text-zinc-500 leading-relaxed">{err.explanation}</p>
                  </div>
                ))}
                {grammarErrors.length > 8 && (
                  <p className="text-center text-xs text-zinc-400 py-1">
                    +{grammarErrors.length - 8} lỗi khác...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Structure Analysis */}
          <div className="bg-white rounded-xl border border-zinc-200 p-5 space-y-3">
            <h3 className="font-bold text-zinc-800 text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-500" />
              Cấu trúc bài viết
            </h3>
            {essay.structure.thesis && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs">
                <p className="font-bold text-blue-700 mb-1">Thesis</p>
                <p className="text-blue-900 leading-relaxed line-clamp-3">
                  {essay.structure.thesis}
                </p>
              </div>
            )}
            {essay.structure.arguments.map((arg, i) => (
              <div key={i} className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs">
                <p className="font-bold text-green-700 mb-1">Main Idea {i + 1}</p>
                <p className="text-green-900 leading-relaxed line-clamp-2">{arg.main}</p>
                <p className="text-green-600 mt-1">{arg.supporting.length} supporting idea(s)</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// SUB COMPONENTS
// ────────────────────────────────────────────────────────────
function CriteriaBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 9) * 100;
  const color =
    score >= 7 ? "bg-green-500" : score >= 5.5 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-600 font-medium">{label}</span>
        <span className="font-bold text-zinc-800">{score.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  valueClass,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  valueClass: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 text-center">
      <div className="flex justify-center mb-1">{icon}</div>
      <div className={`text-2xl font-black ${valueClass}`}>{value}</div>
      <div className="text-xs text-zinc-500 font-medium mt-0.5">{label}</div>
    </div>
  );
}
