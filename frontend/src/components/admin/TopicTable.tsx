import React from "react";
import { Edit2, Trash2, Loader2 } from "lucide-react";
import type { Topic } from "@/types";

interface TopicTableProps {
  topics: Topic[];
  loading: boolean;
  onEdit: (topic: Topic) => void;
  onDelete: (topic: Topic) => void;
}

export function TopicTable({
  topics,
  loading,
  onEdit,
  onDelete,
}: TopicTableProps) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto min-h-[300px] w-full">
      <table className="w-full text-left border-collapse min-w-[760px]">
        <thead>
          <tr className="bg-zinc-50 border-b border-zinc-200 text-xs sm:text-sm uppercase tracking-wider text-zinc-500 font-bold">
            <th className="px-6 py-4 text-center w-16">STT</th>
            <th className="px-6 py-4">Tiêu đề / Prompt</th>
            <th className="px-6 py-4">Phân loại</th>
            <th className="px-6 py-4 text-center">Trạng thái</th>
            <th className="px-6 py-4 text-center w-28">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {topics.map((topic, index) => (
            <tr key={topic.id} className="hover:bg-zinc-50/70 transition-colors">
              <td className="px-6 py-4 text-sm font-bold text-zinc-500 text-center">
                #{index + 1}
              </td>
              <td className="px-6 py-4">
                <div
                  className="text-sm sm:text-base font-bold text-zinc-900 line-clamp-2"
                  title={topic.title}
                >
                  {topic.title}
                </div>
                {topic.description && (
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-1">{topic.description}</p>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <span className="text-xs uppercase font-bold tracking-wider text-zinc-600">
                    {topic.category || "General"}
                  </span>
                  <span className="text-xs uppercase font-bold tracking-wider text-[#932120]">
                    {topic.task_type} • {topic.difficulty}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4 text-center whitespace-nowrap">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                    topic.is_active
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {topic.is_active ? "Active" : "Draft"}
                </span>
              </td>
              <td className="px-6 py-4 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => onEdit(topic)}
                    className="p-2 text-zinc-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors shadow-2xs"
                    title="Chỉnh sửa"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(topic)}
                    className="p-2 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors shadow-2xs"
                    title="Xóa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {topics.length === 0 && !loading && (
            <tr>
              <td colSpan={5} className="text-center py-12 text-zinc-500 text-sm">
                Không tìm thấy đề thi nào
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
