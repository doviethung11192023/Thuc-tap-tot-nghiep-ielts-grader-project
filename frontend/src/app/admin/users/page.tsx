import React from 'react';
import { AdminPageLayout } from '@/components/layout/AdminPageLayout';
import { Search, UserCheck, UserX, UserMinus } from 'lucide-react';

export default function AdminUsersPage() {
  const users = [
    { id: 'U1024', name: 'Nguyễn Văn A', email: 'nva@student.ptit.edu.vn', joined: '15/07/2026', essays: 12, status: 'Active' },
    { id: 'U1025', name: 'Trần Thị B', email: 'ttb@student.ptit.edu.vn', joined: '16/07/2026', essays: 5, status: 'Active' },
    { id: 'U1026', name: 'Lê Hoàng C', email: 'lhc@gmail.com', joined: '18/07/2026', essays: 0, status: 'Inactive' },
    { id: 'U1027', name: 'Phạm D', email: 'phamd@hotmail.com', joined: '20/07/2026', essays: 34, status: 'Banned' },
  ];

  return (
    <AdminPageLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Quản lý Học viên</h1>
          <p className="text-sm text-zinc-500 mt-1">Danh sách người dùng và trạng thái tài khoản</p>
        </div>

        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-200 flex justify-between items-center bg-zinc-50/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm email, tên..." 
                className="pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-64 bg-white"
              />
            </div>
            <div className="flex gap-2">
              <span className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-md">
                Active: 1,200
              </span>
              <span className="text-sm font-medium text-red-500 bg-red-50 px-3 py-1.5 rounded-md">
                Banned: 84
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                  <th className="px-6 py-4">Học viên</th>
                  <th className="px-6 py-4">Ngày tham gia</th>
                  <th className="px-6 py-4 text-center">Số bài viết</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-zinc-900">{user.name}</div>
                          <div className="text-xs text-zinc-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-600">{user.joined}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block bg-zinc-100 text-zinc-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {user.essays}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                        user.status === 'Active' ? 'bg-green-100 text-green-700' : 
                        user.status === 'Banned' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {user.status === 'Banned' ? (
                          <button className="p-1.5 text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Unban">
                            <UserCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Ban">
                            <UserX className="w-4 h-4" />
                          </button>
                        )}
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
