"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Header } from "./Header";
import { QuestionPanel } from "./QuestionPanel";
import { WritingCanvas } from "./WritingCanvas";
import { EssayHighlighter, HighlightLegend } from "./EssayHighlighter";
import { getEssayResults, submitEssay } from "@/services/essays";
import { mapApiResultToGradingResult } from "@/lib/adapters";
import { GradingResult, InlineAnnotation } from "@/types";
import { BookOpen, RefreshCw, AlertTriangle, Save, Trash2, X } from "lucide-react";
import { ScoreSidebar, CriterionTab } from "./ScoreSidebar";
import { useRealtimeEssayStatus } from "@/hooks/useRealtimeEssayStatus";
import toast from "react-hot-toast";
import { AuthGuard } from '@/components/guards/AuthGuard';
import { useRouter } from "next/navigation";

type WorkspaceState = "writing" | "grading" | "results";

export function WorkspaceLayout() {
  const router = useRouter();
  const [state, setState] = useState<WorkspaceState>("writing");
  const [result, setResult] = useState<GradingResult | null>(null);
  const [submittedText, setSubmittedText] = useState("");
  
  // Custom Topic / System Topic state
  const [topicId, setTopicId] = useState<string | null>(null);
  const [taskType, setTaskType] = useState<"task1" | "task2">("task2");

  // Exit & Draft state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

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

  // Handle hard navigation (F5, close tab)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((state === "writing" && hasUnsavedChanges) || state === "grading") {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [state, hasUnsavedChanges]);

  // Handle soft navigation (Exit button)
  const handleExitClick = () => {
    if (state === "writing" && hasUnsavedChanges) {
      setShowExitModal(true);
    } else if (state === "grading") {
      setShowExitModal(true);
    } else {
      router.push("/dashboard");
    }
  };

  const confirmExit = (action: "discard" | "save" | "wait") => {
    if (action === "discard") {
      localStorage.removeItem(`draft_essay_${topicId || 'custom'}`);
      router.push("/dashboard");
    } else if (action === "save") {
      // Auto-save already handles saving, just route
      router.push("/dashboard");
    } else if (action === "wait") {
      setShowExitModal(false);
    }
  };

  return (
    <AuthGuard>
      <div className="h-screen w-full flex flex-col bg-zinc-50 overflow-hidden font-sans">
        <Header onExitClick={handleExitClick} />
      <div className="flex-1 flex overflow-hidden relative">
        <QuestionPanel 
          onTopicChange={setTopicId} 
          onTaskTypeChange={setTaskType} 
        />

        {/* Center Panel */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-white shadow-[0_0_40px_rgba(0,0,0,0.05)] z-10">
          {state === "writing" && (
            <div className="absolute inset-0 z-10 bg-white">
              <WritingCanvas 
                onSubmit={handleSubmit} 
                topicId={topicId}
                onUnsavedChanges={setHasUnsavedChanges}
              />
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

      {/* EXIT MODAL */}
      {showExitModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-[450px] shadow-2xl p-6 relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowExitModal(false)} className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  {state === "grading" ? "AI Đang Chấm Điểm" : "Xác Nhận Thoát"}
                </h3>
                <p className="text-sm text-zinc-500 mt-1">
                  {state === "grading" 
                    ? "Bài của bạn đã được lưu và AI đang phân tích. Nếu thoát bây giờ, bạn có thể xem lại kết quả sau trong Lịch Sử."
                    : "Bạn có bài viết đang làm dở. Thời gian thi sẽ không được bảo lưu nếu bạn thoát."}
                </p>
              </div>
            </div>
            
            {state === "grading" ? (
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowExitModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-colors">
                  Tiếp tục chờ
                </button>
                <button onClick={() => router.push("/dashboard")} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#932120] hover:bg-[#7a1a19] transition-colors shadow-md">
                  Về trang chủ
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button onClick={() => confirmExit("save")} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white bg-[#932120] hover:bg-[#7a1a19] transition-colors shadow-md">
                  <Save className="w-4 h-4" /> Lưu bản nháp & Thoát
                </button>
                <button onClick={() => confirmExit("discard")} className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                  <Trash2 className="w-4 h-4" /> Xóa bản nháp & Thoát
                </button>
                <button onClick={() => setShowExitModal(false)} className="w-full px-5 py-3 rounded-xl text-sm font-semibold text-zinc-600 bg-zinc-100 hover:bg-zinc-200 transition-colors mt-2">
                  Hủy, ở lại làm bài
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      </div>
    </AuthGuard>
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
