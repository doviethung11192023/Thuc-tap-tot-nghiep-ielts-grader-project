"use client";

import React, { useState } from "react";
import { Library, Target } from "lucide-react";
import { useExamCollections } from "@/hooks/useExamCollection";
import { useStudentPublishedTests } from "@/hooks/useStudentPublishedTests";
import { StudentPracticeBanner } from "@/components/exam/student-practice/StudentPracticeBanner";
import { StudentCollectionsSection } from "@/components/exam/student-practice/StudentCollectionsSection";
import { StudentDirectTestsSection } from "@/components/exam/student-practice/StudentDirectTestsSection";
import { StudentSkillExercisesSection } from "@/components/exam/student-practice/StudentSkillExercisesSection";
import { TestPrepModal } from "@/components/exam/TestPrepModal";
import type { PublishedTestItem } from "@/types/test-practice";

export default function TestPracticePage() {
  const { collections, loading: collectionsLoading } = useExamCollections();
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
    loading,
  } = useStudentPublishedTests(12);

  const [activeTab, setActiveTab] = useState<"explore" | "by-type">("explore");
  const [activeTestPrep, setActiveTestPrep] = useState<{
    id: string;
    title: string;
    skill: "Reading" | "Listening" | "Writing" | "Speaking";
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
    });
  };

  return (
    <div className="w-full max-w-[1536px] mx-auto space-y-5 px-1 sm:px-2">
      <StudentPracticeBanner />

      {/* Tabs Switcher: Khám phá bộ đề vs Luyện theo kỹ năng */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex space-x-1.5 bg-zinc-100 p-1 rounded-xl w-fit border border-zinc-200">
          <button
            id="btn-tab-explore"
            onClick={() => setActiveTab("explore")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "explore"
                ? "bg-white text-[#932120] shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Library className="w-4 h-4" />
            Khám phá đề thi thực tế
          </button>
          <button
            id="btn-tab-skills"
            onClick={() => setActiveTab("by-type")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === "by-type"
                ? "bg-white text-[#932120] shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Target className="w-4 h-4" />
            Luyện theo dạng bài
          </button>
        </div>

        {activeTab === "explore" && (
          <div className="text-xs font-semibold text-zinc-500 hidden sm:block">
            Đang phục vụ <strong className="text-zinc-800">{total}</strong> đề thi chuẩn hóa
          </div>
        )}
      </div>

      {activeTab === "explore" && (
        <div className="space-y-6">
          <StudentCollectionsSection collections={collections} loading={collectionsLoading} />
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
            onOpenTestPrep={handleOpenTestPrep}
          />
        </div>
      )}

      {activeTab === "by-type" && <StudentSkillExercisesSection />}

      {activeTestPrep && (
        <TestPrepModal
          testId={activeTestPrep.id}
          testTitle={activeTestPrep.title}
          skill={activeTestPrep.skill}
          onClose={() => setActiveTestPrep(null)}
        />
      )}
    </div>
  );
}
