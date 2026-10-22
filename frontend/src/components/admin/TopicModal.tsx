import React from "react";
import { X, Loader2 } from "lucide-react";
import type { TaskType, Difficulty } from "@/types";

interface TopicFormData {
  title: string;
  description: string;
  prompt_content: string;
  task_type: TaskType;
  difficulty: Difficulty;
  category: string;
}

interface TopicModalProps {
  isOpen: boolean;
  modalMode: "create" | "edit";
  formData: TopicFormData;
  submitting: boolean;
  onChange: (data: TopicFormData) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export function TopicModal({
  isOpen,
  modalMode,
  formData,
  submitting,
  onChange,
  onSubmit,
  onClose,
}: TopicModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center p-6 border-b border-zinc-200">
          <h2 className="text-xl font-bold text-zinc-900">
            {modalMode === "create" ? "Thêm đề thi mới" : "Cập nhật đề thi"}
          </h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Tiêu đề *</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => onChange({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Đề bài (Prompt) *</label>
            <textarea
              required
              rows={4}
              value={formData.prompt_content}
              onChange={(e) => onChange({ ...formData, prompt_content: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Loại bài thi *</label>
              <select
                value={formData.task_type}
                onChange={(e) => onChange({ ...formData, task_type: e.target.value as TaskType })}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
              >
                <option value="task1">Task 1</option>
                <option value="task2">Task 2</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Độ khó *</label>
              <select
                value={formData.difficulty}
                onChange={(e) => onChange({ ...formData, difficulty: e.target.value as Difficulty })}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Danh mục (Category)</label>
            <input
              type="text"
              value={formData.category}
              onChange={(e) => onChange({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Mô tả thêm (Description)</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => onChange({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-zinc-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-zinc-700 font-semibold hover:bg-zinc-100 rounded-xl text-sm transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-[#932120] text-white font-bold rounded-xl text-sm hover:bg-[#7a1a19] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {modalMode === "create" ? "Thêm mới" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
