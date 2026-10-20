import React from "react";
import { Loader2 } from "lucide-react";
import type { Topic } from "@/types";

interface DeleteTopicModalProps {
  isOpen: boolean;
  topic: Topic | null;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteTopicModal({
  isOpen,
  topic,
  submitting,
  onConfirm,
  onClose,
}: DeleteTopicModalProps) {
  if (!isOpen || !topic) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">Xác nhận xóa đề thi</h2>
          <p className="text-sm text-zinc-600">
            Bạn có chắc chắn muốn xóa đề thi{" "}
            <span className="font-bold text-zinc-900">&quot;{topic.title}&quot;</span>? Hành động này không thể hoàn tác.
          </p>
        </div>
        <div className="p-4 border-t border-zinc-200 flex justify-end gap-3 bg-zinc-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-zinc-700 font-semibold hover:bg-zinc-200 rounded-xl text-sm transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-xl text-sm hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-xs"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Xóa đề thi
          </button>
        </div>
      </div>
    </div>
  );
}
