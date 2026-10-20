"use client";

import React, { useState, useEffect } from "react";
import { PlusCircle, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { createTest, createSection, getTestSets } from "@/services/admin-content";
import type { SkillType, AllowedMode, TestSet } from "@/types/exam";

interface CreateTestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PLACEHOLDERS: Record<SkillType, string> = {
  reading: "VD: Cambridge IELTS 19 - Test 1 - Reading",
  listening: "VD: Cambridge IELTS 19 - Test 1 - Listening",
  writing: "VD: IELTS Writing Actual Test - Task 1 & Task 2",
  speaking: "VD: IELTS Speaking Forecast 2026 - Test 1",
};

const DEFAULT_SECTIONS: Record<SkillType, string[]> = {
  writing: ["Writing Task 1 (Biểu đồ / Bản đồ / Quy trình)", "Writing Task 2 (Bài luận 250+ từ)"],
  speaking: ["Part 1 - Phỏng vấn cá nhân (Interview)", "Part 2 - Thuyết trình Cue Card", "Part 3 - Thảo luận 2 chiều (Discussion)"],
  reading: ["Reading Passage 1", "Reading Passage 2", "Reading Passage 3"],
  listening: ["Listening Section 1", "Listening Section 2", "Listening Section 3", "Listening Section 4"],
};

export function CreateTestModal({ isOpen, onClose, onCreated }: CreateTestModalProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [skill, setSkill] = useState<SkillType>("reading");
  const [testSetId, setTestSetId] = useState<string>("");
  const [durationMin, setDurationMin] = useState<number>(60);
  const [allowedMode, setAllowedMode] = useState<AllowedMode>("both");
  const [testSets, setTestSets] = useState<TestSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getTestSets().then(setTestSets).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSkillChange = (newSkill: SkillType) => {
    setSkill(newSkill);
    if (newSkill === "speaking") setDurationMin(15);
    else if (newSkill === "listening") setDurationMin(30);
    else setDurationMin(60);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề đề thi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await createTest({
        title: title.trim(),
        skill,
        test_set_id: testSetId || undefined,
        duration_min: durationMin,
        allowed_mode: allowedMode,
        status: "draft"
      });

      // Auto-initialize standard default sections for this skill
      const sectionsToCreate = DEFAULT_SECTIONS[skill] || [];
      for (let i = 0; i < sectionsToCreate.length; i++) {
        try {
          await createSection(res.id, {
            order_no: i + 1,
            title: sectionsToCreate[i],
          });
        } catch {
          // Non-critical if auto-section fails
        }
      }

      onCreated();
      onClose();
      router.push(`/admin/tests/${res.id}/edit`);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Không thể tạo đề thi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#932120]/10 flex items-center justify-center text-[#932120]">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">Tạo Đề Thi Mới</h3>
              <p className="text-[11px] text-zinc-500">Soạn đề Reading, Listening, Writing hoặc Speaking</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Kỹ năng thi:</label>
              <select
                value={skill}
                onChange={(e) => handleSkillChange(e.target.value as SkillType)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#932120] font-semibold text-zinc-800"
              >
                <option value="reading">Reading (Đọc)</option>
                <option value="listening">Listening (Nghe)</option>
                <option value="writing">Writing (Viết)</option>
                <option value="speaking">Speaking (Nói)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Thời gian (phút):</label>
              <input
                type="number"
                min={1}
                max={180}
                value={durationMin}
                onChange={(e) => setDurationMin(parseInt(e.target.value) || 60)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Tiêu đề bài thi:</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={PLACEHOLDERS[skill]}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Thuộc Bộ Đề Thi (Tùy chọn):</label>
            <select
              value={testSetId}
              onChange={(e) => setTestSetId(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#932120]"
            >
              <option value="">-- Không phân loại --</option>
              {testSets.map((ts) => (
                <option key={ts.id} value={ts.id}>{ts.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Chế độ cho phép:</label>
            <select
              value={allowedMode}
              onChange={(e) => setAllowedMode(e.target.value as AllowedMode)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#932120]"
            >
              <option value="both">Cả Luyện tập & Thi thử (Both)</option>
              <option value="practice">Chỉ Luyện tập (Practice)</option>
              <option value="mock">Chỉ Thi thử (Mock Test)</option>
            </select>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {error}
            </div>
          )}

          <div className="pt-2 border-t border-zinc-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 rounded-xl text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-[#932120] text-white rounded-xl text-xs font-bold hover:bg-[#7a1a19] transition-colors flex items-center gap-2 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Tiếp tục soạn đề
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
