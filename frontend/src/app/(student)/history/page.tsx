import React from 'react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Search, Filter, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function HistoryPage() {
  const history = [
    { id: 'E-1004', topic: 'The widespread use of the internet...', date: '21/07/2026', band: 6.5, status: 'Graded' },
    { id: 'E-1003', topic: 'Global warming is one of the most serious...', date: '18/07/2026', band: 7.0, status: 'Graded' },
    { id: 'E-1002', topic: 'In the future, nobody will buy printed...', date: '10/07/2026', band: 6.0, status: 'Graded' },
    { id: 'E-1001', topic: 'Despite advances in medicine...', date: '05/07/2026', band: 5.5, status: 'Graded' },
  ];

  return (
    <StudentPageLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Lịch sử làm bài</h1>
            <p className="text-zinc-500 mt-1">Danh sách tất cả các bài luận bạn đã nộp (UC07)</p>
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
            <button className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
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
              <tbody className="divide-y divide-zinc-100">
                {history.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-zinc-500">{item.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-zinc-900 line-clamp-1">{item.topic}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{item.date}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-100 text-green-700">
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-black text-[#932120]">{item.band.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link href={`/results/${item.id}`}>
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
        </div>
      </div>
    </StudentPageLayout>
  );
}
