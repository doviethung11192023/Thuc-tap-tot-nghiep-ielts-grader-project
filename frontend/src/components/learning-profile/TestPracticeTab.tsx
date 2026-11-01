"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { WeeklySkillCards } from "./WeeklySkillCards";
import { TestPracticeScoreLineChart } from "./TestPracticeScoreLineChart";
import { AIDiagnosticCard } from "./AIDiagnosticCard";
import { QuestionTypeHighlights } from "./QuestionTypeHighlights";
import { QuestionTypeReportTable } from "./QuestionTypeReportTable";
import { PracticeHistoryTimeline } from "./PracticeHistoryTimeline";
import type { LearningProfileTestPracticeData } from "@/types/learning-profile";

interface TestPracticeTabProps {
  data: LearningProfileTestPracticeData | null;
  loading?: boolean;
}

export function TestPracticeTab({ data, loading }: TestPracticeTabProps) {
  const [subTab, setSubTab] = useState<"highlight" | "report">("highlight");

  if (loading || !data) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-9 h-9 animate-spin mx-auto text-[#932120] mb-3" />
        <p className="text-xs text-zinc-500 font-semibold">Đang tổng hợp tiến trình luyện thi Test Practice của bạn...</p>
      </div>
    );
  }

  const {
    skill_averages,
    score_tracking,
    ai_feedback,
    highlights,
    question_type_report,
    recent_history,
  } = data;

  return (
    <div className="space-y-7 w-full">
      {/* 1. Điểm trung bình hàng tuần & Delta so với tuần trước */}
      <WeeklySkillCards skillAverages={skill_averages} />

      {/* 2. Theo dõi điểm số (Line Chart 30 bài gần nhất) */}
      <TestPracticeScoreLineChart scoreTracking={score_tracking} />

      {/* 3. Nhận xét AI Sư phạm */}
      <AIDiagnosticCard feedback={ai_feedback} />

      {/* 4. Kết quả học tập theo dạng bài (Sub-tabs: Highlight | Báo cáo toàn thời gian) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h3 className="font-black text-zinc-900 text-base tracking-tight">Kết quả học tập theo dạng bài</h3>
            <p className="text-xs text-zinc-500 mt-0.5">Theo dõi kết quả luyện tập và xem phân tích chi tiết theo từng dạng bài</p>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
            <button
              onClick={() => setSubTab("highlight")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === "highlight"
                  ? "bg-white text-[#932120] shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Highlight tiêu biểu
            </button>
            <button
              onClick={() => setSubTab("report")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                subTab === "report"
                  ? "bg-white text-[#932120] shadow-2xs"
                  : "text-zinc-600 hover:text-zinc-900"
              }`}
            >
              Báo cáo toàn thời gian
            </button>
          </div>
        </div>

        {subTab === "highlight" ? (
          <QuestionTypeHighlights highlights={highlights} />
        ) : (
          <QuestionTypeReportTable reportRows={question_type_report} />
        )}
      </div>

      {/* 5. Lịch sử Test Practice dạng Timeline */}
      <PracticeHistoryTimeline history={recent_history} />
    </div>
  );
}
