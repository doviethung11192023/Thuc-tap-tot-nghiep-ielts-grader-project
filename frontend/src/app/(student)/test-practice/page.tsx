"use client";

import React, { useState } from "react";
import { Library, Target } from "lucide-react";
import { m } from "motion/react";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useStudentPublishedTests } from "@/hooks/useStudentPublishedTests";
import { StudentPracticeBanner } from "@/components/exam/student-practice/StudentPracticeBanner";
import { StudentMockLauncherSection } from "@/components/exam/student-practice/StudentMockLauncherSection";
import { StudentDirectTestsSection } from "@/components/exam/student-practice/StudentDirectTestsSection";
import { StudentSkillExercisesSection } from "@/components/exam/student-practice/StudentSkillExercisesSection";
import { PracticeHistorySidebarWidget } from "@/components/exam/student-practice/PracticeHistorySidebarWidget";
import { TestPrepModal } from "@/components/exam/TestPrepModal";
import type { PublishedTestItem } from "@/types/test-practice";

export default function TestPracticePage() {
  const {
    page,
    setPage,
    limit,
    skill,
    setSkill,
    difficulty,
    setDifficulty,
    search,
    setSearch,
    tests,
    total,
    catalogTotal,
    skillCounts,
    difficultyCounts,
    loading,
  } = useStudentPublishedTests(12);

  const [activeTab, setActiveTab] = useState<"explore" | "by-type">(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("moonlab_practice_active_tab");
        if (saved === "explore" || saved === "by-type") return saved;
      } catch {}
    }
    return "explore";
  });

  const handleTabChange = (tab: "explore" | "by-type") => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("moonlab_practice_active_tab", tab);
      } catch {}
    }
  };

  const [activeTestPrep, setActiveTestPrep] = useState<{
    id: string;
    title: string;
    skill: "Reading" | "Listening" | "Writing" | "Speaking";
    allowedMode?: "practice" | "mock" | "both";
    durationMin?: number;
  } | null>(null);

  const handleOpenTestPrep = (test: PublishedTestItem) => {
    const rawSkill = test.skill?.toLowerCase() || "reading";
    const normalizedSkill =
      rawSkill === "listening"
        ? "Listening"
        : rawSkill === "writing"
        ? "Writing"
        : rawSkill === "speaking"
        ? "Speaking"
        : "Reading";

    setActiveTestPrep({
      id: test.id,
      title: test.title,
      skill: normalizedSkill,
      allowedMode: test.allowed_mode || "both",
      durationMin: test.duration_min,
    });
  };

  return (
    <div className="w-full max-w-[1536px] mx-auto px-1 sm:px-2">
      <div className="flex flex-col 2xl:flex-row gap-6 items-start">
        {/* Main Content Area (Trái) */}
        <div className="flex-1 min-w-0 space-y-5 w-full">
          <StudentPracticeBanner />

          {/* Tabs Switcher: Khám phá bộ đề vs Luyện theo kỹ năng */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex space-x-1.5 bg-[var(--ux-surface-2)] p-1 rounded-xl w-fit border border-[var(--ux-line)]">
              <button
                id="btn-tab-explore"
                type="button"
                onClick={() => handleTabChange("explore")}
                className={`relative px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === "explore"
                    ? "text-[#932120]"
                    : "text-[var(--ux-ink-2)] hover:text-[var(--ux-ink)]"
                }`}
              >
                {activeTab === "explore" && (
                  <m.span
                    layoutId="test-practice-tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-[var(--ux-surface)] shadow-xs border border-[var(--ux-line)]"
                  />
                )}
                <Library className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Khám phá đề thi thực tế</span>
              </button>
              <button
                id="btn-tab-skills"
                type="button"
                onClick={() => handleTabChange("by-type")}
                className={`relative px-4 py-2 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 cursor-pointer ${
                  activeTab === "by-type"
                    ? "text-[#932120]"
                    : "text-[var(--ux-ink-2)] hover:text-[var(--ux-ink)]"
                }`}
              >
                {activeTab === "by-type" && (
                  <m.span
                    layoutId="test-practice-tab-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="absolute inset-0 rounded-lg bg-[var(--ux-surface)] shadow-xs border border-[var(--ux-line)]"
                  />
                )}
                <Target className="w-4 h-4 relative z-10" />
                <span className="relative z-10">Luyện theo dạng bài</span>
              </button>
            </div>

            {activeTab === "explore" && (
              <div className="text-xs font-semibold text-[var(--ux-ink-2)] hidden sm:block">
                Đang phục vụ <strong className="text-[var(--ux-ink)] tabular-nums"><AnimatedNumber value={catalogTotal} /></strong> đề thi chuẩn hóa
              </div>
            )}
          </div>

          {activeTab === "explore" && (
            <div className="space-y-6">
              <StudentMockLauncherSection />
              <StudentDirectTestsSection
                skill={skill}
                setSkill={setSkill}
                difficulty={difficulty}
                setDifficulty={setDifficulty}
                search={search}
                setSearch={setSearch}
                tests={tests}
                total={total}
                page={page}
                setPage={setPage}
                limit={limit}
                loading={loading}
                skillCounts={skillCounts}
                difficultyCounts={difficultyCounts}
                onOpenTestPrep={handleOpenTestPrep}
              />
            </div>
          )}

          {activeTab === "by-type" && <StudentSkillExercisesSection />}
        </div>

        {/* Right Sidebar: Lịch sử luyện đề + Bộ sưu tập của tôi (Hình 2 & 3) */}
        <PracticeHistorySidebarWidget />
      </div>

      {activeTestPrep && (
        <TestPrepModal
          key={`${activeTestPrep.id}-${activeTestPrep.allowedMode ?? "both"}`}
          testId={activeTestPrep.id}
          testTitle={activeTestPrep.title}
          skill={activeTestPrep.skill}
          allowedMode={activeTestPrep.allowedMode}
          durationMin={activeTestPrep.durationMin}
          onClose={() => setActiveTestPrep(null)}
        />
      )}
    </div>
  );
}
