"use client";

import React from 'react';
import { AlertCircle } from 'lucide-react';

interface WritingIncompleteModalProps {
  isOpen: boolean;
  task1HasContent: boolean;
  task2HasContent: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function WritingIncompleteModal({
  isOpen,
  task1HasContent,
  task2HasContent,
  onCancel,
  onConfirm,
}: WritingIncompleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center gap-3 text-amber-600">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-amber-700" />
          </div>
          <div>
            <h3 className="font-bold text-base text-zinc-900">Cảnh báo nộp thiếu Task</h3>
            <p className="text-xs text-zinc-500">Chế độ Phòng thi (Mock Test) chuẩn IELTS</p>
          </div>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed">
          Bạn đang nộp bài khi một trong hai Task (Task 1 hoặc Task 2) còn bỏ trống.
          Theo quy chuẩn Cambridge, phần bỏ trống sẽ nhận <strong>0 điểm</strong> và kéo tụt điểm Overall Writing theo công thức trọng số <strong>(Task 1 + 2 × Task 2) / 3</strong>.
        </p>

        <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-1.5 font-medium">
          <div className="flex justify-between">
            <span>Task 1:</span>
            <span className={task1HasContent ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
              {task1HasContent ? "Đã viết" : "Bỏ trống (0đ)"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Task 2:</span>
            <span className={task2HasContent ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
              {task2HasContent ? "Đã viết" : "Bỏ trống (0đ)"}
            </span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold rounded-xl cursor-pointer"
          >
            Quay lại viết tiếp
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
          >
            Vẫn xác nhận nộp
          </button>
        </div>
      </div>
    </div>
  );
}
