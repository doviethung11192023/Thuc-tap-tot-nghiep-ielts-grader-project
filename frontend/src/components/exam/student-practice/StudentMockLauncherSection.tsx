"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAxiosError } from "axios";
import { BookOpen, Headphones, Mic, PenTool, Shuffle, Timer } from "lucide-react";
import { getMockSummary, startRandomMock, type MockSkill, type MockSkillSummary } from "@/services/student-test-practice";

const SKILLS: { key: MockSkill; label: string; minutes: number; Icon: typeof BookOpen }[] = [
  { key: "listening", label: "Listening", minutes: 30, Icon: Headphones },
  { key: "reading", label: "Reading", minutes: 60, Icon: BookOpen },
  { key: "writing", label: "Writing", minutes: 60, Icon: PenTool },
  { key: "speaking", label: "Speaking", minutes: 14, Icon: Mic },
];

/**
 * Thi thử (Mock) từng kỹ năng (UC-08, FR-10). Learner chỉ chọn kỹ năng; hệ thống chọn ngẫu nhiên một đề
 * trong bộ đề Mock mà Learner chưa từng làm, nên không chọn được đề đã luyện hay xem trước.
 */
export function StudentMockLauncherSection() {
  const router = useRouter();
  const [summary, setSummary] = useState<Record<string, MockSkillSummary>>({});
  const [starting, setStarting] = useState<MockSkill | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMockSummary()
      .then((rows) => setSummary(Object.fromEntries(rows.map((r) => [r.skill, r]))))
      .catch(() => setSummary({}));
  }, []);

  const start = async (skill: MockSkill) => {
    setStarting(skill);
    setError(null);
    try {
      const attempt = await startRandomMock(skill);
      router.push(`/test-practice/${skill}/${attempt.test_id}?mode=exam`);
    } catch (err) {
      const detail = isAxiosError(err) ? err.response?.data?.detail : null;
      setError(typeof detail === "string" ? detail : "Không bắt đầu được bài thi thử. Hãy thử lại.");
      setStarting(null);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
          <Shuffle className="w-4 h-4 text-[#932120]" />
          <span>Thi thử (Mock) theo kỹ năng</span>
        </h3>
        <p className="text-xs text-zinc-500 font-medium">
          Hệ thống chọn ngẫu nhiên một đề bạn chưa làm. Đồng hồ đếm ngược do máy chủ giữ, hết giờ tự nộp.
        </p>
      </div>

      {error && (
        <p role="alert" className="text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {SKILLS.map(({ key, label, minutes, Icon }) => {
          const s = summary[key];
          const open = Boolean(s?.open_attempt_id);
          const exhausted = Boolean(s && !open && s.remaining === 0);
          return (
            <button
              key={key}
              type="button"
              onClick={() => start(key)}
              disabled={starting !== null || exhausted}
              className="text-left bg-white rounded-2xl border border-zinc-200 p-4 hover:border-[#932120] hover:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2 font-bold text-zinc-900">
                <Icon className="w-4 h-4 text-[#932120]" /> {label}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-zinc-500">
                <Timer className="w-3.5 h-3.5" /> {minutes} phút
              </div>
              <div className="mt-3 text-xs font-semibold">
                {starting === key ? (
                  <span className="text-zinc-500">Đang chọn đề…</span>
                ) : open ? (
                  <span className="text-[#932120]">Đang làm dở · Làm tiếp</span>
                ) : exhausted ? (
                  <span className="text-zinc-500">Đã làm hết {s?.total} đề</span>
                ) : (
                  <span className="text-zinc-700">
                    {s ? `Còn ${s.remaining}/${s.total} đề chưa làm` : "Bắt đầu"}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
