"use client";

import React, { useState } from "react";
import { PlusCircle, X, Loader2, Image as ImageIcon, Upload } from "lucide-react";
import { createQuestionGroup, uploadMedia } from "@/services/admin-content";
import type { SkillType } from "@/types/exam";

interface QuestionGroupModalProps {
  isOpen: boolean;
  sectionId: string;
  skill: SkillType;
  existingGroupsCount: number;
  onClose: () => void;
  onCreated: () => void;
}

const QUESTION_TYPES_BY_SKILL: Record<string, { value: string; label: string }[]> = {
  reading: [
    { value: "multiple_choice", label: "Multiple Choice (Trắc nghiệm)" },
    { value: "true_false_not_given", label: "True / False / Not Given" },
    { value: "matching", label: "Matching (Nối tiêu đề / Thông tin)" },
    { value: "completion", label: "Completion (Điền từ vào chỗ trống)" },
    { value: "short_answer", label: "Short Answer (Câu trả lời ngắn)" },
  ],
  listening: [
    { value: "multiple_choice", label: "Multiple Choice (Trắc nghiệm)" },
    { value: "completion", label: "Form / Table / Note Completion" },
    { value: "matching", label: "Matching / Classification" },
    { value: "short_answer", label: "Map / Diagram Labelling" },
  ],
  writing: [
    { value: "writing_task1", label: "Writing Task 1 (Biểu đồ / Bản đồ / Quy trình)" },
    { value: "writing_task2", label: "Writing Task 2 (Bài luận 250+ từ)" },
  ],
  speaking: [
    { value: "speaking_part1", label: "Speaking Part 1 (Phỏng vấn cá nhân)" },
    { value: "speaking_part2", label: "Speaking Part 2 (Thuyết trình Cue Card)" },
    { value: "speaking_part3", label: "Speaking Part 3 (Thảo luận 2 chiều chuyên sâu)" },
  ],
};

export function QuestionGroupModal({
  isOpen,
  sectionId,
  skill,
  existingGroupsCount,
  onClose,
  onCreated,
}: QuestionGroupModalProps) {
  const types = QUESTION_TYPES_BY_SKILL[skill] || QUESTION_TYPES_BY_SKILL.reading;
  const [questionType, setQuestionType] = useState(types[0]?.value || "multiple_choice");
  const [instructions, setInstructions] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const res = await uploadMedia(file, "images/question_groups");
      setImageKey(res.url || res.key);
    } catch (err: any) {
      alert("Lỗi tải ảnh lên Cloudflare R2: " + (err.message || ""));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createQuestionGroup(sectionId, {
        order_no: existingGroupsCount + 1,
        question_type: questionType,
        instructions: instructions.trim() || undefined,
        image_key: imageKey.trim() || undefined,
      });
      onCreated();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || "Lỗi tạo nhóm câu hỏi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#932120]/10 flex items-center justify-center text-[#932120]">
              <PlusCircle className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-zinc-900">Thêm Nhóm Dạng Bài</h3>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Dạng câu hỏi (Question Type):</label>
            <select
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
              className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#932120]"
            >
              {types.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Hướng dẫn làm bài (Instructions):</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="VD: Do the following statements agree with the information given in Reading Passage 1?"
              className="w-full p-2.5 border border-zinc-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#932120]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1 flex items-center justify-between">
              <span>Hình ảnh đề bài (Nếu có):</span>
              {imageKey && <span className="text-[10px] text-emerald-600 font-bold">Đã có ảnh</span>}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={imageKey}
                onChange={(e) => setImageKey(e.target.value)}
                placeholder="R2 image key hoặc CDN URL"
                className="flex-1 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs"
              />
              <label className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-lg text-xs font-semibold cursor-pointer flex items-center gap-1 border border-zinc-300">
                {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Upload</span>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
            {imageKey && (
              <img src={imageKey} alt="Preview" className="mt-2 h-24 object-contain rounded border border-zinc-200" />
            )}
          </div>

          {error && <div className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</div>}

          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 border border-zinc-300 rounded-lg text-xs text-zinc-700 hover:bg-zinc-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-[#932120] text-white rounded-lg text-xs font-bold hover:bg-[#7a1a19] flex items-center gap-1.5 shadow-sm"
            >
              {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Tạo nhóm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
