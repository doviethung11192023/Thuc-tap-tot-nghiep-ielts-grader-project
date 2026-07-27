import React from 'react';
import { AdminPageLayout } from '@/components/layout/AdminPageLayout';
import { Search, Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';

export default function AdminTopicsPage() {
  const topics = [
    { id: 'T001', category: 'Education', title: 'Some people believe that the widespread use of the internet...', type: 'Opinion', uses: 1204, status: 'Active' },
    { id: 'T002', category: 'Environment', title: 'Global warming is one of the most serious issues...', type: 'Causes & Solutions', uses: 850, status: 'Active' },
    { id: 'T003', category: 'Technology', title: 'In the future, nobody will buy printed newspapers...', type: 'Opinion', uses: 432, status: 'Draft' },
    { id: 'T004', category: 'Health', title: 'Despite advances in medicine, many people around the world...', type: 'Causes & Solutions', uses: 210, status: 'Active' },
  ];

  return (
    <AdminPageLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Quản lý Đề thi</h1>
            <p className="text-sm text-zinc-500 mt-1">Thêm, sửa, xóa các đề thi trong hệ thống</p>
          </div>
          <button className="bg-[#932120] text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Thêm đề thi mới
          </button>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm đề thi..." 
                className="pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-64 bg-white"
              />
            </div>
            <div className="text-sm font-medium text-zinc-500">
              Tổng cộng: 156 đề thi
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Tiêu đề / Prompt</th>
                  <th className="px-6 py-4">Phân loại</th>
                  <th className="px-6 py-4 text-right">Lượt thi</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {topics.map((topic) => (
                  <tr key={topic.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm text-zinc-500">{topic.id}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-zinc-900 line-clamp-1 max-w-md" title={topic.title}>{topic.title}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">{topic.category}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider text-[#932120]">{topic.type}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-zinc-700 text-right">{topic.uses}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        topic.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {topic.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-1.5 text-zinc-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors" title="Chỉnh sửa">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-zinc-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
