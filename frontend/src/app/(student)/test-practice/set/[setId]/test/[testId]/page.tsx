"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Home, ChevronRight, ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { useExamCollectionDetail } from "@/hooks/useExamCollection";
import { TestPrepModal } from "@/components/exam/TestPrepModal";
import { SkillItemCard } from "@/components/exam/student-practice/SkillItemCard";

export default function TestSkillsListPage() {
  const params = useParams();
  const setId = params?.setId as string;
  const testId = params?.testId as string;

  const { collection, loading } = useExamCollectionDetail(setId);
  const [activePrepModal, setActivePrepModal] = useState<{
    skill: "Reading" | "Listening" | "Writing" | "Speaking";
    testId: string;
    title: string;
  } | null>(null);

  if (loading) {
    return (
      <div className="py-24 text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120] mx-auto" />
        <p className="text-xs text-zinc-500 font-medium">Đang tải danh sách kỹ năng...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="py-20 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-900">Không tìm thấy bộ đề thi</h2>
        <Link
          href="/test-practice"
          className="inline-flex px-4 py-2 bg-[#932120] text-white rounded-xl text-xs font-bold hover:bg-[#7a1a19] transition-colors"
        >
          Quay lại Test Practice
        </Link>
      </div>
    );
  }

  const test = collection.tests?.find((t) => t.id === testId) || collection.tests?.[0];
  if (!test) {
    return (
      <div className="py-20 text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-900">Không tìm thấy bài thi</h2>
        <Link
          href={`/test-practice/set/${collection.id}`}
          className="inline-flex px-4 py-2 bg-[#932120] text-white rounded-xl text-xs font-bold hover:bg-[#7a1a19] transition-colors"
        >
          Quay lại bộ đề
        </Link>
      </div>
    );
  }

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
        {(test.skills || []).map((skillItem) => (
          <SkillItemCard
            key={skillItem.skill}
            skillItem={skillItem}
            testId={test.id}
            testTitle={test.title}
            returnUrl={`/test-practice/set/${setId}/test/${testId}`}
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
          returnUrl={`/test-practice/set/${setId}/test/${testId}`}
          onClose={() => setActivePrepModal(null)}
        />
      )}
    </div>
  );
}
