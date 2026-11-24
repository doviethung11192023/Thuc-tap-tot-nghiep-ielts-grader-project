"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { ArrowRight, Compass, Loader2, Target, Timer } from "lucide-react";
import { startRandomMock } from "@/services/student-test-practice";
import type { LearnerNextStep, NextStepSuggestion } from "@/types/learning-profile";

const SKILL_LABEL: Record<string, string> = {
  listening: "Listening", reading: "Reading", writing: "Writing", speaking: "Speaking",
};

/** Link mở bài trong 1 click (FR-017): Practice cả đề hoặc từng phần đề. */
function practiceHref(s: NextStepSuggestion): string {
  const parts = s.parts.length ? `&parts=${s.parts.join(",")}` : "";
  return `/test-practice/${s.skill}/${s.test_id}?mode=practice${parts}`;
}

function suggestionTitle(s: NextStepSuggestion): string {
  if (s.kind === "mock") return `Thi thử (Mock) ${SKILL_LABEL[s.skill]}`;
  const part = s.parts.length ? ` · ${s.skill === "writing" ? "Task" : "Phần"} ${s.parts.join(", ")}` : "";
  return `${s.test_title ?? "Đề luyện tập"}${part}`;
}

function suggestionHint(s: NextStepSuggestion): string {
  if (s.kind === "mock") return "Hệ thống chọn ngẫu nhiên 1 đề bạn chưa làm, tính giờ như thi thật";
  if (s.kind === "diagnostic") return "Làm đủ cả đề để hệ thống tính band";
  if (s.predicted_correct !== null) return `Dự đoán bạn làm đúng khoảng ${Math.round(s.predicted_correct * 100)}%`;
  return s.last_done_at ? "Bạn đã làm đề này gần đây" : "Đề bạn chưa làm gần đây";
}

interface NextStepCardProps {
  nextStep: LearnerNextStep | null;
  loading: boolean;
  error: string | null;
  onOpenGoalModal: () => void;
}

/** Thẻ "Bước tiếp theo" (BR-17, ADR-23): 1 kỹ năng ưu tiên, 1 câu lý do, tối đa 3 gợi ý bắt đầu được ngay. */
export function NextStepCard({ nextStep, loading, error, onOpenGoalModal }: NextStepCardProps) {
  const router = useRouter();
  const [startingMock, setStartingMock] = useState(false);
  const [mockError, setMockError] = useState<string | null>(null);

  const startMock = async (skill: NextStepSuggestion["skill"]) => {
    setStartingMock(true);
    setMockError(null);
    try {
      const attempt = await startRandomMock(skill);
      router.push(`/test-practice/${skill}/${attempt.test_id}?mode=exam`);
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      setMockError(typeof detail === "string" ? detail : "Không bắt đầu được bài thi thử. Hãy thử lại.");
      setStartingMock(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#932120]/20 p-4 sm:p-5 shadow-2xs space-y-3">
      <h3 className="text-sm font-black text-zinc-900 flex items-center gap-2">
        <Compass className="w-4 h-4 text-[#932120]" /> Bước tiếp theo
      </h3>

      {loading && !nextStep ? (
        <p className="text-xs text-zinc-500 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Đang tính lộ trình…
        </p>
      ) : error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : !nextStep?.goal_set ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-zinc-600">Đặt band mục tiêu để hệ thống gợi ý bạn nên luyện gì tiếp theo.</p>
          <button
            type="button"
            onClick={onOpenGoalModal}
            className="px-3.5 py-1.5 rounded-xl bg-[#932120] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer hover:bg-[#7a1a19]"
          >
            <Target className="w-3.5 h-3.5" /> Đặt mục tiêu
          </button>
        </div>
      ) : (
        <>
          {nextStep.priority_skill && (
            <span className="inline-block px-2 py-0.5 rounded-md bg-[#932120]/10 text-[#932120] text-[11px] font-bold uppercase tracking-wider">
              Ưu tiên: {SKILL_LABEL[nextStep.priority_skill]}
            </span>
          )}
          <p className="text-sm font-semibold text-zinc-800">{nextStep.reason}</p>
          {nextStep.weak_spot?.comment && (
            <p className="text-xs text-zinc-600 border-l-2 border-zinc-200 pl-2">
              Nhận xét {nextStep.weak_spot.label} bài gần nhất: {nextStep.weak_spot.comment}
            </p>
          )}
          {nextStep.weak_spot?.prompt_type && (
            <p className="text-xs text-zinc-600">Dạng đề yếu nhất: {nextStep.weak_spot.prompt_type}</p>
          )}
          {mockError && <p role="alert" className="text-xs text-red-700">{mockError}</p>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {(nextStep.suggestions ?? []).map((s, i) => {
              const body = (
                <>
                  <span className="text-xs font-bold text-zinc-900 line-clamp-2">{suggestionTitle(s)}</span>
                  <span className="text-[11px] text-zinc-500">{suggestionHint(s)}</span>
                  <span className="mt-auto pt-1 text-[11px] font-bold text-[#932120] flex items-center gap-1">
                    {s.kind === "mock" ? <Timer className="w-3 h-3" /> : null}
                    {startingMock && s.kind === "mock" ? "Đang chọn đề…" : "Bắt đầu"} <ArrowRight className="w-3 h-3" />
                  </span>
                </>
              );
              const cls = "text-left flex flex-col gap-1 rounded-xl border border-zinc-200 p-3 hover:border-[#932120] hover:shadow-xs transition-all";
              return s.kind === "mock" ? (
                <button key={`mock-${i}`} type="button" disabled={startingMock} onClick={() => startMock(s.skill)}
                        className={`${cls} cursor-pointer disabled:opacity-60`}>
                  {body}
                </button>
              ) : (
                <Link key={`${s.test_id}-${s.parts.join("-")}`} href={practiceHref(s)} className={cls}>
                  {body}
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
