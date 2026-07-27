"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Header } from "./Header";
import { QuestionPanel } from "./QuestionPanel";
import { WritingCanvas } from "./WritingCanvas";
import { EssayHighlighter, HighlightLegend } from "./EssayHighlighter";
import { DUMMY_RESULT, GradingResult, InlineAnnotation, CriteriaScore } from "./dummy_data";
import {
  BookOpen, RefreshCw
} from "lucide-react";
import { ScoreSidebar, CriterionTab } from "./ScoreSidebar";

type WorkspaceState = "writing" | "grading" | "results";

async function simulateGrading(essayText: string): Promise<GradingResult> {
  await new Promise((r) => setTimeout(r, 2000));
  return {
    ...DUMMY_RESULT,
    content: essayText, 
    word_count: essayText.trim().split(/\s+/).length,
  };
}

export function WorkspaceLayout() {
  const [state, setState] = useState<WorkspaceState>("writing");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  const [activeCriterion, setActiveCriterion] = useState<CriterionTab>("OVERALL");
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  const handleSubmit = useCallback(async (essayText: string) => {
    if (!essayText.trim()) return;
    setSubmittedText(essayText);
    setState("grading");
    try {
      const data = await simulateGrading(essayText);
      setResult(data);
      setState("results");
    } catch {
      setState("writing");
      alert("Lỗi.");
    }
  }, []);

  const handleRetry = useCallback(() => {
    setState("writing");
    setResult(null);
    setSubmittedText("");
    setActiveAnnotationId(null);
  }, []);

  const handleAnnotationClick = useCallback((ann: InlineAnnotation) => {
    setActiveCriterion(ann.category);
    setActiveAnnotationId(ann.id);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-zinc-50 overflow-hidden font-sans">
      <Header />
      <div className="flex-1 flex overflow-hidden relative">
        <QuestionPanel />

        {/* Center Panel */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-white shadow-[0_0_40px_rgba(0,0,0,0.05)] z-10">
          {state === "writing" && (
            <div className="absolute inset-0 z-10 bg-white">
              <WritingCanvas onSubmit={handleSubmit} />
            </div>
          )}
          {state === "grading" && (
            <div className="absolute inset-0 z-20 bg-white flex items-center justify-center">
              <GradingLoader />
            </div>
          )}
          {state === "results" && result && (
            <div className="absolute inset-0 z-10 flex flex-col">
              <div className="flex items-center justify-between px-6 py-3 border-b border-zinc-100 bg-white z-10">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Kết quả</span>
                  <span className="text-xs bg-green-100 text-green-700 font-bold px-2 py-0.5 rounded-full">✓ Đã chấm xong</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{result.word_count} từ</span>
                  <button onClick={handleRetry} className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 border px-3 py-1.5 rounded-lg hover:border-[#932120] hover:text-[#932120] transition-colors">
                    <RefreshCw className="w-3.5 h-3.5" /> Thử lại
                  </button>
                </div>
              </div>
              <div className="px-6 py-3 border-b border-zinc-100 shrink-0 bg-zinc-50/50">
                <HighlightLegend />
              </div>
              <div className="flex-1 px-10 py-8 overflow-y-auto">
                <EssayHighlighter
                  content={result.content}
                  annotations={result.inline_annotations}
                  onAnnotationClick={handleAnnotationClick}
                  activeAnnotationId={activeAnnotationId}
                  activeCategoryFilter={activeCriterion === "OVERALL" ? null : activeCriterion}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Score Sidebar */}
        <div className={`w-[400px] shrink-0 border-l border-zinc-200 bg-white flex flex-col transition-all duration-300 z-20 ${state === "results" ? "translate-x-0 opacity-100" : "translate-x-full opacity-0 absolute right-0"}`}>
          {result && (
            <ScoreSidebar
              result={result}
              activeCriterion={activeCriterion}
              setActiveCriterion={setActiveCriterion}
              activeAnnotationId={activeAnnotationId}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// LOADER
function GradingLoader() {
  return (
    <div className="flex flex-col items-center gap-6 text-center px-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-zinc-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#932120] animate-spin" />
        <BookOpen className="absolute inset-0 m-auto w-7 h-7 text-[#932120]" />
      </div>
      <h3 className="text-lg font-bold">AI đang phân tích...</h3>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// SCORE SIDEBAR HAS BEEN MOVED TO ScoreSidebar.tsx
