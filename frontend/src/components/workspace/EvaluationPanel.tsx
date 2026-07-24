import React from 'react';
import { X, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface EvaluationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EvaluationPanel({ isOpen, onClose }: EvaluationPanelProps) {
  return (
    <div className="w-[360px] bg-white border-l border-zinc-200 flex flex-col h-full shadow-2xl relative z-20">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-zinc-100">
        <h2 className="text-xl font-bold text-zinc-800">Evaluation Result</h2>
        <button
          onClick={onClose}
          className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Overall Band & Type */}
        <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-200 flex flex-col items-center justify-center text-center">
          <span className="text-sm font-bold text-zinc-500 uppercase tracking-widest mb-2">Overall Band Score</span>
          <div className="text-6xl font-black text-[#932120] drop-shadow-sm">6.5</div>
          <div className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1 rounded-full text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            +0.5 from last attempt
          </div>
          <div className="mt-3 text-xs font-bold text-zinc-500 bg-white border border-zinc-200 px-3 py-1.5 rounded-md w-full">
            Dạng bài: <span className="text-[#932120]">Opinion (Agree/Disagree)</span>
          </div>
        </div>

        {/* Criteria breakdown */}
        <div className="space-y-4">
          <h3 className="font-bold text-zinc-800 flex items-center gap-2">
            Detailed Criteria (IELTS Rubric)
          </h3>
          
          <CriteriaBar label="Task Response (TR)" score={6.0} color="bg-amber-500" description="Mức độ trả lời câu hỏi, phát triển ý" />
          <CriteriaBar label="Coherence & Cohesion (CC)" score={7.0} color="bg-green-500" description="Tính mạch lạc, liên kết câu/đoạn" />
          <CriteriaBar label="Lexical Resource (LR)" score={6.5} color="bg-blue-500" description="Vốn từ vựng, độ chính xác từ" />
          <CriteriaBar label="Grammar (GRA)" score={6.0} color="bg-amber-500" description="Đa dạng & chính xác ngữ pháp" />
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-zinc-800">284</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-1">Words</div>
          </div>
          <div className="bg-white border border-zinc-200 rounded-xl p-4 shadow-sm text-center">
            <div className="text-2xl font-bold text-zinc-800">32:15</div>
            <div className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mt-1">Time taken</div>
          </div>
        </div>

        {/* Errors to fix */}
        <div className="space-y-4">
          <h3 className="font-bold text-zinc-800 flex items-center gap-2 border-b border-zinc-100 pb-2">
            Errors to Fix (3)
          </h3>
          
          <div className="space-y-3">
            <ErrorItem 
              original="much peoples"
              correction="many people"
              type="Grammar"
            />
            <ErrorItem 
              original="bad effect"
              correction="detrimental impact"
              type="Vocabulary"
            />
            <ErrorItem 
              original="in the other hand"
              correction="on the other hand"
              type="Collocation"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function CriteriaBar({ label, score, color, description }: { label: string; score: number; color: string; description?: string }) {
  const percentage = (score / 9) * 100;
  return (
    <div className="space-y-1.5 bg-zinc-50 border border-zinc-100 p-3 rounded-xl">
      <div className="flex justify-between items-start text-sm">
        <div>
          <span className="font-bold text-zinc-700">{label}</span>
          {description && <div className="text-[10px] text-zinc-400 mt-0.5">{description}</div>}
        </div>
        <span className="font-black text-zinc-800 bg-white border border-zinc-200 px-2 py-0.5 rounded shadow-sm">{score.toFixed(1)}</span>
      </div>
      <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden mt-2">
        <div 
          className={`h-full ${color} rounded-full`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function ErrorItem({ original, correction, type }: { original: string; correction: string; type: string }) {
  return (
    <div className="p-3 rounded-lg border border-red-100 bg-red-50/50">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded uppercase tracking-wider">{type}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
        <span className="line-through text-red-600 decoration-red-400 font-medium">{original}</span>
      </div>
      <div className="flex items-center gap-2 text-sm mt-1">
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
        <span className="text-green-700 font-medium">{correction}</span>
      </div>
    </div>
  );
}
