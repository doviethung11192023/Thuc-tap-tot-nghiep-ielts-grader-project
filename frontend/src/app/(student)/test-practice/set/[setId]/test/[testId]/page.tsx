"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight, ArrowLeft } from "lucide-react";
import { useExamCollectionDetail } from "@/hooks/useExamCollection";
import { TestPrepModal } from "@/components/exam/TestPrepModal";
import { SkillItemCard } from "@/components/exam/student-practice/SkillItemCard";

export default function TestSkillsListPage() {
  const params = useParams();
  const setId = params?.setId as string;
  const testId = params?.testId as string;

  const { collection } = useExamCollectionDetail(setId);
  const test = collection.tests.find((t) => t.id === testId) || collection.tests[0];

  const [activePrepModal, setActivePrepModal] = useState<{
    skill: "Reading" | "Listening" | "Writing" | "Speaking";
    testId: string;
    title: string;
  } | null>(null);

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 px-2 sm:px-4 py-3">
      <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500 overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
        <Link href="/test-practice" className="hover:text-[#932120] flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Test Practice</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
        <Link href={`/test-practice/set/${collection.id}`} className="hover:text-[#932120] transition-colors">
          {collection.title}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
        <span className="text-zinc-800 font-bold">{test.title}</span>
      </nav>

      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Danh sách kỹ năng
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Chọn kỹ năng để bắt đầu làm bài hoặc xem lại lịch sử kết quả các lần thi trước
          </p>
        </div>

        <Link
          href={`/test-practice/set/${collection.id}`}
          className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center gap-1.5 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại bộ đề</span>
        </Link>
      </div>

      <div className="space-y-4">
        {test.skills.map((skillItem) => (
          <SkillItemCard
            key={skillItem.skill}
            skillItem={skillItem}
            testId={test.id}
            testTitle={test.title}
            onOpenPrepModal={(skill) =>
              setActivePrepModal({
                skill,
                testId: test.id,
                title: `${test.title} - ${skill}`,
              })
            }
          />
        ))}
      </div>

      {activePrepModal && (
        <TestPrepModal
          testId={activePrepModal.testId}
          testTitle={activePrepModal.title}
          skill={activePrepModal.skill}
          onClose={() => setActivePrepModal(null)}
        />
      )}
    </div>
  );
}
