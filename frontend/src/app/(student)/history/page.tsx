"use client";

import React, { useEffect, useState } from 'react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Search, Filter, ArrowRight, Loader2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { getEssayHistory } from '@/services/essays';
import { EssayHistoryItem } from '@/types';
import toast from 'react-hot-toast';

export default function HistoryPage() {
  const [history, setHistory] = useState<EssayHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination and filtering states
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    async function fetchHistory() {
      try {
        setLoading(true);
        const data = await getEssayHistory({ page, limit, status: statusFilter || undefined });
        setHistory(data.items);
        setTotal(data.total);
      } catch (err) {
        console.error("Failed to fetch history:", err);
        toast.error("Không thể lấy danh sách lịch sử. Vui lòng thử lại sau.");
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [page, limit, statusFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <StudentPageLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Lịch sử làm bài</h1>
            <p className="text-zinc-500 mt-1">Danh sách tất cả các bài luận bạn đã nộp</p>
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-full sm:w-64"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="p-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#932120] bg-white text-zinc-700"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="completed">Đã chấm (Completed)</option>
              <option value="pending">Chờ chấm (Pending)</option>
              <option value="evaluating">Đang chấm (Evaluating)</option>
              <option value="failed">Lỗi (Failed)</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Đề bài</th>
                  <th className="px-6 py-4">Ngày nộp</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Band Score</th>
                  <th className="px-6 py-4 text-center">Chi tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 relative">
                {loading && (
                  <tr>
                    <td colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-400 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="text-sm">Đang tải dữ liệu...</span>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && history.length === 0 && (
                  <tr>
                    <td colSpan={6} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center text-zinc-400 gap-3">
                        <BookOpen className="w-12 h-12 text-zinc-200" />
                        <span className="text-sm font-medium text-zinc-500">Chưa có bài viết nào.</span>
                        <Link href="/dashboard" className="mt-2 text-sm text-[#932120] font-semibold hover:underline">
                          Viết bài mới ngay
                        </Link>
                      </div>
                    </td>
                  </tr>
                )}
                {!loading && history.map((item) => (
                  <tr key={item.essay_id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">
                      {item.essay_id.split('-')[0].toUpperCase()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-zinc-900 line-clamp-1" title={item.topic_title}>
                        {item.topic_title}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">
                      {new Date(item.submitted_at).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        item.status === 'completed' ? 'bg-green-100 text-green-700' :
                        item.status === 'failed' ? 'bg-red-100 text-red-700' :
                        item.status === 'evaluating' ? 'bg-blue-100 text-blue-700' :
                        'bg-zinc-100 text-zinc-700'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {item.overall_band !== null && item.overall_band !== undefined ? (
                        <span className="font-black text-[#932120] text-lg">{item.overall_band.toFixed(1)}</span>
                      ) : (
                        <span className="text-zinc-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/results/${item.essay_id}`}>
                        <button className="p-1.5 text-zinc-400 hover:text-[#932120] rounded-md hover:bg-red-50 transition-colors inline-flex justify-center items-center">
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination controls */}
          {!loading && totalPages > 1 && (
            <div className="border-t border-zinc-200 px-6 py-4 flex items-center justify-between bg-zinc-50">
              <span className="text-sm text-zinc-500">
                Hiển thị trang {page} / {totalPages} (Tổng cộng {total} bài)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 text-sm border border-zinc-200 rounded-md bg-white text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100"
                >
                  Trước
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  className="px-3 py-1 text-sm border border-zinc-200 rounded-md bg-white text-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-zinc-100"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </StudentPageLayout>
  );
}
