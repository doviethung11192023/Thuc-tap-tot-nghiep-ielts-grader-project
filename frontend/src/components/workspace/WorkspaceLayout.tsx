"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Header } from "./Header";
import { QuestionPanel } from "./QuestionPanel";
import { WritingCanvas } from "./WritingCanvas";
import { EssayHighlighter, HighlightLegend } from "./EssayHighlighter";
import { getEssayResults, submitEssay } from "@/services/essays";
import { mapApiResultToGradingResult } from "@/lib/adapters";
import { GradingResult, InlineAnnotation } from "@/types";
import { BookOpen, RefreshCw } from "lucide-react";
import { ScoreSidebar, CriterionTab } from "./ScoreSidebar";
import { useRealtimeEssayStatus } from "@/hooks/useRealtimeEssayStatus";
import toast from "react-hot-toast";

type WorkspaceState = "writing" | "grading" | "results";

export function WorkspaceLayout() {
  const [state, setState] = useState<WorkspaceState>("writing");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  
  // Custom Topic / System Topic state
  const [topicId, setTopicId] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<"task1" | "task2">("task2");

  const [activeCriterion, setActiveCriterion] = useState<CriterionTab>("OVERALL");
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  // Hook realtime tracking status
  const [essayId, setEssayId] = useState<string | null>(null);
  const { status, isError } = useRealtimeEssayStatus(essayId);

  const handleSubmit = useCallback(async (essayText: string) => {
    const text = essayText.trim();
    if (!text) return;
    
    // 0. Frontend Validation
    const wordCount = text.split(/\s+/).length;
    if (wordCount < 50) {
      toast.error("Bài viết quá ngắn. Yêu cầu tối thiểu 50 từ.");
      return;
    }
    if (wordCount > 1000) {
      toast.error("Bài viết quá dài. Vui lòng giới hạn dưới 1000 từ.");
      return;
    }

    setSubmittedText(text);
    setState("grading");
    setResult(null);
    setEssayId(null);
    
    try {
      // 1. Submit essay to backend
      const data = await submitEssay({
        content: text,
        topic_id: topicId,
        task_type: taskType
      });
      
      // 2. Save essayId to start realtime tracking
      setEssayId(data.essay_id);
    } catch (err) {
      console.error(err);
      let errorMsg = "Lỗi khi nộp bài. Vui lòng thử lại.";
      
      // Parse Axios/FastAPI 422 Validation Error safely
      interface ErrorWithResponse {
        response?: {
          status?: number;
          data?: {
            detail?: Array<{ msg: string }>;
            message?: string;
          };
        };
      }
      
      const axiosError = err as ErrorWithResponse;
      if (axiosError?.response?.status === 422 && Array.isArray(axiosError.response.data?.detail)) {
        errorMsg = axiosError.response.data.detail.map((d) => d.msg).join(", ");
        // Translate English error from Pydantic to Vietnamese for better UX
        if (errorMsg.includes("Minimum requirement is 50 words")) {
          errorMsg = "Bài viết quá ngắn. Yêu cầu tối thiểu 50 từ.";
        }
      } else if (axiosError?.response?.data?.message) {
        errorMsg = axiosError.response.data.message;
      }
      
      toast.error(errorMsg);
      setState("writing");
    }
  }, [topicId, taskType]);

  // Listen to realtime status changes
  useEffect(() => {
    if (state !== "grading" || !essayId) return;

    if (status === "failed" || status === "rejected") {
      toast.error("Quá trình chấm bài thất bại.");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState("writing");
      setEssayId(null);
    } else if (status === "completed") {
      const fetchResults = async () => {
        try {
          const resData = await getEssayResults(essayId);
          
          if (!resData.result) {
            toast.error("Bài viết chưa được chấm xong hoặc có lỗi dữ liệu.");
            setState("writing");
            return;
          }

          const gradingResult = mapApiResultToGradingResult(resData);

          setResult(gradingResult);
          setState("results");
        } catch (err) {
          console.error(err);
          toast.error("Không lấy được kết quả chấm.");
          setState("writing");
        }
      };
      
      fetchResults();
    }
  }, [status, state, essayId, submittedText]);

  const handleRetry = useCallback(() => {
    setState("writing");
    setResult(null);
    setSubmittedText("");
    setActiveAnnotationId(null);
    setEssayId(null);
  }, []);

  const handleAnnotationClick = useCallback((ann: InlineAnnotation) => {
    setActiveCriterion(ann.category);
    setActiveAnnotationId(ann.id);
  }, []);

  return (
    <div className="h-screen w-full flex flex-col bg-zinc-50 overflow-hidden font-sans">
      <Header />
      <div className="flex-1 flex overflow-hidden relative">
        <QuestionPanel 
          onTopicChange={setTopicId} 
          onTaskTypeChange={setTaskType} 
        />

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
