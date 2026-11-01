"use client";

import React from "react";
import { CheckCircle2, Layers } from "lucide-react";

interface QuestionTypeItem {
  type_name: string;
  skill: string;
  total_questions: number;
  correct: number;
  accuracy: number;
  last_practiced: string;
}

interface PracticeQuestionTypeAccuracyCardProps {
  questionTypes: QuestionTypeItem[];
}

export function PracticeQuestionTypeAccuracyCard({ questionTypes }: PracticeQuestionTypeAccuracyCardProps) {
  const displayItems = questionTypes.length > 0 ? questionTypes.slice(0, 5) : [
    { type_name: "Sentence Completion", skill: "Reading", total_questions: 40, correct: 30, accuracy: 75, last_practiced: "12/10/2026" },
    { type_name: "Multiple Choice (MCQ)", skill: "Listening", total_questions: 25, correct: 18, accuracy: 72, last_practiced: "10/10/2026" },
    { type_name: "Matching Headings", skill: "Reading", total_questions: 35, correct: 22, accuracy: 63, last_practiced: "08/10/2026" },
    { type_name: "True / False / Not Given", skill: "Reading", total_questions: 30, correct: 16, accuracy: 53, last_practiced: "05/10/2026" },
    { type_name: "Note & Summary Completion", skill: "Listening", total_questions: 20, correct: 13, accuracy: 65, last_practiced: "02/10/2026" },
  ];

  return (
    <div className="bg-white rounded-3xl border border-zinc-200/90 p-5 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
        <div>
          <h3 className="font-black text-zinc-900 text-sm tracking-tight flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-600" />
            <span>Kết quả học tập theo dạng bài</span>
          </h3>
          <p className="text-[11px] text-zinc-500 mt-0.5">Tỷ lệ chính xác trung bình theo từng nhóm câu hỏi</p>
        </div>
      </div>

      <div className="space-y-3">
        {displayItems.map((item, idx) => (
          <div key={idx} className="p-3 rounded-2xl bg-zinc-50 border border-zinc-150 space-y-1.5 hover:bg-white hover:border-zinc-300 transition-all">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-zinc-800 line-clamp-1">{item.type_name}</span>
              <span className={`font-black text-xs px-2 py-0.5 rounded-lg ${
                item.accuracy >= 70 ? 'bg-emerald-100 text-emerald-800' :
                item.accuracy >= 50 ? 'bg-amber-100 text-amber-800' :
                'bg-red-100 text-red-800'
              }`}>
                {item.accuracy}%
              </span>
            </div>

            <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  item.accuracy >= 70 ? 'bg-emerald-500' :
                  item.accuracy >= 50 ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, item.accuracy))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-0.5">
              <span>Kỹ năng: <strong className="text-zinc-700">{item.skill}</strong></span>
              <span>Đúng: <strong className="text-zinc-700">{item.correct}/{item.total_questions}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
