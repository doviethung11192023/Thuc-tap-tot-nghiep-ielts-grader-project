import React, { useState, useEffect, useRef } from "react";
import { InlineAnnotation, CriteriaDetail, GradingResult } from "@/types";
import { AlertCircle, Sparkles, TrendingUp, ChevronRight, CheckCircle2, BookOpen, Quote } from "lucide-react";

export type CriterionTab = "OVERALL" | "TR" | "CC" | "LR" | "GRA";

interface ScoreSidebarProps {
  result: GradingResult;
  activeCriterion: CriterionTab;
  setActiveCriterion: (tab: CriterionTab) => void;
  activeAnnotationId: string | null;
  setActiveAnnotationId?: (id: string | null) => void;
  activeTypes?: string[];
}

export const ScoreSidebar = React.memo(function ScoreSidebar({ result, activeCriterion, setActiveCriterion, activeAnnotationId, activeTypes = ['error', 'logic_issue', 'upgrade', 'strength'] }: ScoreSidebarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCriterion !== "OVERALL" && activeAnnotationId && scrollRef.current) {
      const el = document.getElementById(`ann-${activeAnnotationId}`);
      if (el) {
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 100);
      }
    }
  }, [activeAnnotationId, activeCriterion]);

  const tabs: { id: CriterionTab; label: string; tooltip: string }[] = [
    { id: "OVERALL", label: "Tổng quan", tooltip: "Điểm tổng" },
    { id: "TR", label: "TR", tooltip: "Task Response" },
    { id: "CC", label: "CC", tooltip: "Coherence & Cohesion" },
    { id: "LR", label: "LR", tooltip: "Lexical Resource" },
    { id: "GRA", label: "GRA", tooltip: "Grammar & Accuracy" },
  ];

  const getCriteriaData = (tab: CriterionTab): CriteriaDetail | null => {
    if (tab === "TR") return result.criteria_analysis.task_response;
    if (tab === "CC") return result.criteria_analysis.coherence_cohesion;
    if (tab === "LR") return result.criteria_analysis.lexical_resource;
    if (tab === "GRA") return result.criteria_analysis.grammar_accuracy;
    return null;
  };

  const getCriteriaBand = (tab: CriterionTab): number => {
    if (tab === "TR") return result.scores.task_response;
    if (tab === "CC") return result.scores.coherence_cohesion;
    if (tab === "LR") return result.scores.lexical_resource;
    if (tab === "GRA") return result.scores.grammatical_range_and_accuracy;
    return 0;
  }

  return (
    <div className="flex flex-col h-full bg-zinc-50/30">
      {/* 5 Main Tabs Navigation */}
      <div className="flex border-b border-zinc-200 shrink-0 bg-white px-2">
        {tabs.map(t => (
          <button
            key={t.id}
            title={t.tooltip}
            onClick={() => setActiveCriterion(t.id)}
            className={`flex-1 py-3.5 text-xs font-bold border-b-2 transition-colors ${activeCriterion === t.id ? "border-[#932120] text-[#932120]" : "border-transparent text-zinc-500 hover:text-zinc-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-5" ref={scrollRef}>
        {activeCriterion === "OVERALL" ? (
          <OverallTab result={result} />
        ) : (
          <CriterionDetailTab 
            criteriaData={getCriteriaData(activeCriterion)!} 
            criteriaBand={getCriteriaBand(activeCriterion)}
            annotations={result.inline_annotations.filter(a => {
              if (a.category !== activeCriterion) return false;
              if (!activeTypes.includes(a.type)) return false;
              return true;
            })}
            activeAnnotationId={activeAnnotationId}
            criterionName={tabs.find(t => t.id === activeCriterion)?.tooltip || ""}
          />
        )}
      </div>
    </div>
  );
});

// ────────────────────────────────────────────────────────────
// TAB: OVERALL
function OverallTab({ result }: { result: GradingResult }) {
  const scores = [
    { label: "Task Response", val: result.scores.task_response, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Coherence & Cohesion", val: result.scores.coherence_cohesion, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Lexical Resource", val: result.scores.lexical_resource, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Grammatical Range", val: result.scores.grammatical_range_and_accuracy, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      <div className="text-center py-6">
        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] mb-1">Overall Band</p>
        <div className="text-6xl font-black text-[#932120] tracking-tighter">{result.scores.overall_band.toFixed(1)}</div>
      </div>

      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 mb-4 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-zinc-500" /> Bảng điểm chi tiết
        </h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {scores.map(s => (
            <div key={s.label} className={`p-4 rounded-xl border border-zinc-100 ${s.bg}`}>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.val.toFixed(1)}</p>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-zinc-100 p-4 rounded-xl text-sm text-zinc-600">
        <p>Vui lòng click vào các tab <strong>TR, CC, LR, GRA</strong> phía trên để xem phân tích chi tiết và các lỗi trong bài.</p>
      </div>

      {result.overall_upgraded_essay && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 mb-3 flex items-center gap-2">
            <Quote className="w-4 h-4 text-indigo-500" /> Bài mẫu nâng cấp (Band 8.0+)
          </h3>
          <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-xl whitespace-pre-wrap">
            <p className="text-sm text-indigo-900 leading-relaxed italic">
              {result.overall_upgraded_essay}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// TAB: CRITERION DETAIL
function CriterionDetailTab({ 
  criteriaData, 
  criteriaBand,
  annotations, 
  activeAnnotationId, 
  criterionName 
}: { 
  criteriaData: CriteriaDetail, 
  criteriaBand: number,
  annotations: InlineAnnotation[], 
  activeAnnotationId: string | null, 
  criterionName: string 
}) {
  
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div>
          <h2 className="text-lg font-black text-zinc-800">{criterionName}</h2>
          <p className="text-xs text-zinc-500">Phân tích chi tiết</p>
        </div>
        <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-xl font-black text-[#932120]">
          {criteriaBand.toFixed(1)}
        </div>
      </div>

      {/* Sub Criteria (Text Based Evaluation) */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 mb-3">Đánh giá tiêu chí</h3>
        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100 shadow-sm">
          {Object.entries(criteriaData.sub_criteria || {}).map(([name, evaluation]) => (
            <div key={name} className="p-4 hover:bg-zinc-50 transition-colors">
              <span className="text-xs font-bold text-zinc-700 capitalize block mb-1">{name.replace(/_/g, ' ')}</span>
              <span className="text-sm text-zinc-600 leading-relaxed">{evaluation}</span>
            </div>
          ))}
          {(!criteriaData.sub_criteria || Object.keys(criteriaData.sub_criteria).length === 0) && (
            <div className="p-4 text-sm text-zinc-500 italic">Chưa có phân tích chi tiết.</div>
          )}
        </div>
      </div>

      {/* Strengths & Improvements */}
      <div className="grid gap-4">
        <div className="bg-green-50/50 border border-green-100 p-4 rounded-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-green-800 mb-2 flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> Ưu điểm</h4>
          <ul className="list-disc pl-4 space-y-1 text-sm text-green-900">
            {((criteriaData.feedback?.strengths as string[] | undefined) || ((criteriaData as unknown as Record<string, unknown>).strengths as string[] | undefined) || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        
        <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl">
          <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 mb-2 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Cần cải thiện</h4>
          <ul className="list-disc pl-4 space-y-1 text-sm text-red-900">
            {((criteriaData.feedback?.areas_to_improve as string[] | undefined) || ((criteriaData as unknown as Record<string, unknown>).areas_to_improve as string[] | undefined) || []).map((s: string, i: number) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>

      {/* Annotations */}
      {annotations.length > 0 && (
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 mb-3">Lỗi & Điểm sáng cụ thể</h3>
          <div className="space-y-3">
            {annotations.map(ann => (
              <AnnotationCard key={ann.id} annotation={ann} isActive={activeAnnotationId === ann.id} />
            ))}
          </div>
        </div>
      )}
      
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// ANNOTATION CARD
function AnnotationCard({ annotation, isActive }: { annotation: InlineAnnotation, isActive: boolean }) {
  const isError = annotation.type === "error";
  const isLogic = annotation.type === "logic_issue";
  const isUpgrade = annotation.type === "upgrade";
  
  const colorCls = isError ? "border-red-200 bg-red-50/50" 
    : isLogic ? "border-orange-200 bg-orange-50/50"
    : isUpgrade ? "border-purple-200 bg-purple-50/50"
    : "border-green-200 bg-green-50/50";
    
  const textCls = isError ? "text-red-800" : isLogic ? "text-orange-800" : isUpgrade ? "text-purple-800" : "text-green-800";
  const badgeCls = isError ? "bg-red-100 text-red-700" : isLogic ? "bg-orange-100 text-orange-700" : isUpgrade ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700";

  return (
    <div id={`ann-${annotation.id}`} className={`p-4 rounded-xl border transition-all duration-300 ${colorCls} ${isActive ? "ring-2 ring-[#932120] shadow-md scale-[1.02]" : "hover:shadow-sm"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${badgeCls}`}>
          {annotation.title || annotation.type}
        </span>
      </div>
      
      {annotation.type !== 'strength' && annotation.original_text && (
        <div className="mb-3 flex items-center gap-2 flex-wrap text-sm">
          <span className={`line-through font-medium bg-white/60 px-1 rounded ${textCls}`}>{annotation.original_text}</span>
          {annotation.corrected_text && (
            <>
              <ChevronRight className="w-3 h-3 text-zinc-400" />
              <span className={`font-bold bg-white px-1.5 rounded ${textCls}`}>{annotation.corrected_text}</span>
            </>
          )}
        </div>
      )}

      <p className="text-sm text-zinc-700 leading-relaxed mb-3">{annotation.explanation}</p>

      {annotation.recommendation && (
        <div className="mt-3 pt-3 border-t border-black/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1 flex items-center gap-1.5"><Sparkles className="w-3 h-3 text-amber-500" /> Gợi ý sửa</p>
          <p className="text-sm text-zinc-800 italic">{annotation.recommendation}</p>
        </div>
      )}
    </div>
  );
}
