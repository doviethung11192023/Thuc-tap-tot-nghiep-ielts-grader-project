"use client";

import React, { useState, useCallback } from "react";
import { Header } from "./Header";
import { QuestionPanel } from "./QuestionPanel";
import { WritingCanvas } from "./WritingCanvas";
import { EssayHighlighter, HighlightLegend } from "./EssayHighlighter";
import type { Highlight } from "./EssayHighlighter";
import {
  AlertCircle, CheckCircle2, TrendingUp, RefreshCw,
  ChevronRight, BookOpen, X
} from "lucide-react";

// ── Mock result type (sẽ thay bằng API response thật) ──────────────────────
interface GradingResult {
  essay_id: number;
  content: string;
  word_count: number;
  scores: {
    overall_band: number;
    task_response_score: number;
    coherence_cohesion_score: number;
    lexical_resource_score: number;
    grammar_accuracy_score: number;
  };
  highlights: Highlight[];
  structure: {
    thesis: string | null;
    arguments: Array<{ main: string; supporting: string[] }>;
  };
  overall_feedback?: string;
}

type WorkspaceState = "writing" | "grading" | "results";

interface WorkspaceLayoutProps {
  /** Truyền mock result để demo (thay bằng API call thật sau) */
  mockResult?: GradingResult;
}

// ── Lấy 1 bài mock ngẫu nhiên để simulate API response ────────────────────
async function simulateGrading(essayText: string): Promise<GradingResult> {
  // Giả lập network delay 2–3s
  await new Promise((r) => setTimeout(r, 2500));

  // Trong production: thay bằng await fetch("/api/v1/essays/evaluate", {...})
  const mockEssays = (await import("@/data/mock_essays.json")).default as GradingResult[];
  const random = mockEssays[Math.floor(Math.random() * mockEssays.length)];
  return {
    ...random,
    content: essayText,          // Dùng bài thật của học viên
    word_count: essayText.trim().split(/\s+/).length,
    // highlights giữ nguyên từ mock (AI thật sẽ tính lại dựa trên content thật)
  };
}

// ══════════════════════════════════════════════════════════════════════════════
export function WorkspaceLayout(_props: WorkspaceLayoutProps) {
  const [state, setState] = useState<WorkspaceState>("writing");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  const [activeSidePanel, setActiveSidePanel] = useState<"errors" | "structure">("errors");

  // Khi học viên bấm Submit
  const handleSubmit = useCallback(async (essayText: string) => {
    if (!essayText.trim()) return;
    setSubmittedText(essayText);
    setState("grading");

    try {
      const data = await simulateGrading(essayText);
      setResult(data);
      setState("results");
    } catch {
      // Nếu lỗi → quay về writing
      setState("writing");
      alert("Có lỗi xảy ra khi chấm bài. Vui lòng thử lại.");
    }
  }, []);

  // Reset về trạng thái viết bài mới
  const handleRetry = useCallback(() => {
    setState("writing");
    setResult(null);
    setSubmittedText("");
  }, []);

  const grammarErrors = result?.highlights.filter((h) => h.type === "grammar_error") ?? [];
  const structureNodes = result?.highlights.filter((h) => h.type !== "grammar_error") ?? [];

  return (
    <div className="h-screen w-full flex flex-col bg-zinc-50 overflow-hidden font-sans">
      <Header />

      <div className="flex-1 flex overflow-hidden relative">
        {/* ── LEFT: Question Panel (luôn hiển thị) ── */}
        <QuestionPanel />

        {/* ── CENTER: Writing Canvas / Loading / Results ── */}
        <div className="flex-1 relative overflow-hidden">

          {/* Writing state */}
          <div
            className={`absolute inset-0 transition-all duration-500 ${
              state === "writing"
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-4 pointer-events-none"
            }`}
          >
            <WritingCanvas onSubmit={handleSubmit} />
          </div>

          {/* Grading / Loading state */}
          <div
            className={`absolute inset-0 flex items-center justify-center bg-white transition-all duration-500 ${
              state === "grading"
                ? "opacity-100 scale-100 pointer-events-auto"
                : "opacity-0 scale-95 pointer-events-none"
            }`}
          >
            <GradingLoader />
          </div>

          {/* Results state — Essay Highlighter */}
          <div
            className={`absolute inset-0 overflow-y-auto bg-white transition-all duration-500 ${
              state === "results"
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 translate-y-4 pointer-events-none"
            }`}
          >
            {result && (
              <ResultsView
                result={result}
                onRetry={handleRetry}
                activeSidePanel={activeSidePanel}
                setActiveSidePanel={setActiveSidePanel}
              />
            )}
          </div>
        </div>

        {/* ── RIGHT: Score Sidebar (chỉ hiện khi results) ── */}
        <div
          className={`w-[300px] shrink-0 border-l border-zinc-200 bg-white overflow-y-auto transition-all duration-500 ${
            state === "results"
              ? "translate-x-0 opacity-100"
              : "translate-x-full opacity-0 pointer-events-none"
          } absolute right-0 top-0 bottom-0 md:relative md:translate-x-0 ${
            state !== "results" ? "md:w-0 md:overflow-hidden md:border-0" : ""
          }`}
        >
          {result && (
            <ScoreSidebar
              result={result}
              grammarErrors={grammarErrors}
              structureNodes={structureNodes}
              activeSidePanel={activeSidePanel}
              setActiveSidePanel={setActiveSidePanel}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// GRADING LOADER
// ══════════════════════════════════════════════════════════════════════════════
function GradingLoader() {
  return (
    <div className="flex flex-col items-center gap-6 text-center px-8">
      {/* Animated rings */}
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-zinc-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#932120] animate-spin" />
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-zinc-300 animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
        <BookOpen className="absolute inset-0 m-auto w-7 h-7 text-[#932120]" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-bold text-zinc-800">AI đang chấm bài...</h3>
        <p className="text-sm text-zinc-500">Phân tích ngữ pháp, cấu trúc và 4 tiêu chí IELTS</p>
      </div>

      {/* Progress steps */}
      <div className="flex flex-col gap-2 w-full max-w-xs text-left">
        {[
          "Kiểm tra ngữ pháp & chính tả",
          "Phân tích cấu trúc luận điểm",
          "Đánh giá 4 tiêu chí IELTS",
          "Tổng hợp kết quả",
        ].map((step, i) => (
          <div key={i} className="flex items-center gap-3 text-xs text-zinc-500">
            <div
              className="w-4 h-4 rounded-full bg-zinc-200 animate-pulse shrink-0"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
            {step}
          </div>
        ))}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// RESULTS VIEW (center panel)
// ══════════════════════════════════════════════════════════════════════════════
function ResultsView({
  result,
  onRetry,
  activeSidePanel,
  setActiveSidePanel,
}: {
  result: GradingResult;
  onRetry: () => void;
  activeSidePanel: "errors" | "structure";
  setActiveSidePanel: (v: "errors" | "structure") => void;
}) {
  return (
    <div className="h-full flex flex-col">
      {/* Sub-header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100 bg-zinc-50/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
            Kết quả chấm điểm
          </span>
          <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">
            ✓ Đã chấm xong
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">{result.word_count} từ</span>
          <button
            onClick={onRetry}
            className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 hover:text-[#932120] bg-white border border-zinc-200 hover:border-[#932120] px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Làm bài mới
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-b border-zinc-100">
        <HighlightLegend />
      </div>

      {/* Essay with highlights */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <EssayHighlighter
          content={result.content}
          highlights={result.highlights}
        />
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCORE SIDEBAR (right panel)
// ══════════════════════════════════════════════════════════════════════════════
function ScoreSidebar({
  result,
  grammarErrors,
  structureNodes,
  activeSidePanel,
  setActiveSidePanel,
}: {
  result: GradingResult;
  grammarErrors: Highlight[];
  structureNodes: Highlight[];
  activeSidePanel: "errors" | "structure";
  setActiveSidePanel: (v: "errors" | "structure") => void;
}) {
  const s = result.scores;

  return (
    <div className="flex flex-col h-full">
      {/* Overall Score */}
      <div className="p-5 border-b border-zinc-100 text-center bg-zinc-50">
        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">
          Overall Band Score
        </p>
        <div className="text-5xl font-black text-[#932120]">
          {s.overall_band.toFixed(1)}
        </div>
      </div>

      {/* 4 Criteria */}
      <div className="p-4 border-b border-zinc-100 space-y-3">
        <CriteriaBar label="Task Response" score={s.task_response_score} />
        <CriteriaBar label="Coherence & Cohesion" score={s.coherence_cohesion_score} />
        <CriteriaBar label="Lexical Resource" score={s.lexical_resource_score} />
        <CriteriaBar label="Grammar" score={s.grammar_accuracy_score} />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 divide-x divide-zinc-100 border-b border-zinc-100">
        <button
          onClick={() => setActiveSidePanel("errors")}
          className={`p-3 text-center transition-colors ${activeSidePanel === "errors" ? "bg-red-50" : "hover:bg-zinc-50"}`}
        >
          <div className="flex justify-center mb-0.5">
            <AlertCircle className={`w-4 h-4 ${activeSidePanel === "errors" ? "text-red-500" : "text-zinc-400"}`} />
          </div>
          <div className={`text-xl font-black ${activeSidePanel === "errors" ? "text-red-600" : "text-zinc-700"}`}>
            {grammarErrors.length}
          </div>
          <div className="text-[10px] text-zinc-500 font-semibold uppercase">Lỗi</div>
        </button>
        <button
          onClick={() => setActiveSidePanel("structure")}
          className={`p-3 text-center transition-colors ${activeSidePanel === "structure" ? "bg-green-50" : "hover:bg-zinc-50"}`}
        >
          <div className="flex justify-center mb-0.5">
            <CheckCircle2 className={`w-4 h-4 ${activeSidePanel === "structure" ? "text-green-500" : "text-zinc-400"}`} />
          </div>
          <div className={`text-xl font-black ${activeSidePanel === "structure" ? "text-green-600" : "text-zinc-700"}`}>
            {structureNodes.length}
          </div>
          <div className="text-[10px] text-zinc-500 font-semibold uppercase">Cấu trúc</div>
        </button>
      </div>

      {/* Detail panel — toggle giữa Errors và Structure */}
      <div className="flex-1 overflow-y-auto">
        {activeSidePanel === "errors" ? (
          <ErrorPanel errors={grammarErrors} />
        ) : (
          <StructurePanel structure={result.structure} />
        )}
      </div>
    </div>
  );
}

// ── Error list ───────────────────────────────────────────────────────────────
function ErrorPanel({ errors }: { errors: Highlight[] }) {
  if (errors.length === 0) {
    return (
      <div className="p-6 text-center text-zinc-400 text-sm">
        <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
        Không phát hiện lỗi ngữ pháp!
      </div>
    );
  }
  return (
    <div className="p-4 space-y-2">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-3">
        Lỗi cần sửa ({errors.length})
      </p>
      {errors.map((err) => (
        <div key={err.id} className="p-3 rounded-lg bg-red-50/60 border border-red-100 text-xs space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="line-through text-red-600 font-semibold">{err.original_text}</span>
            {err.corrected_text && (
              <>
                <ChevronRight className="w-3 h-3 text-zinc-400 shrink-0" />
                <span className="text-green-700 font-semibold">{err.corrected_text}</span>
              </>
            )}
          </div>
          <p className="text-zinc-500 leading-relaxed">{err.explanation}</p>
        </div>
      ))}
    </div>
  );
}

// ── Structure analysis ───────────────────────────────────────────────────────
function StructurePanel({ structure }: { structure: GradingResult["structure"] }) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
        <TrendingUp className="inline w-3.5 h-3.5 mr-1" />
        Cấu trúc bài viết
      </p>
      {structure.thesis && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-xs">
          <p className="font-bold text-blue-700 mb-1">Thesis</p>
          <p className="text-blue-900 leading-relaxed line-clamp-4">{structure.thesis}</p>
        </div>
      )}
      {structure.arguments.map((arg, i) => (
        <div key={i} className="p-3 rounded-lg bg-green-50 border border-green-200 text-xs">
          <p className="font-bold text-green-700 mb-1">Main Idea {i + 1}</p>
          <p className="text-green-900 leading-relaxed line-clamp-3">{arg.main}</p>
          <p className="text-green-600 mt-1.5 font-medium">
            {arg.supporting.length} supporting idea{arg.supporting.length !== 1 ? "s" : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Criteria bar ─────────────────────────────────────────────────────────────
function CriteriaBar({ label, score }: { label: string; score: number }) {
  const pct = (score / 9) * 100;
  const color = score >= 7 ? "bg-green-500" : score >= 5.5 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-zinc-600 font-medium truncate pr-2">{label}</span>
        <span className="font-bold text-zinc-800 shrink-0">{score.toFixed(1)}</span>
      </div>
      <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
