"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { AdminPageLayout } from '@/components/layout/AdminPageLayout';
import { Search, UserCheck, UserX, Loader2 } from 'lucide-react';
import { getAdminUsers, updateUserStatus } from '@/services/users';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { User } from '@/types';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAdminUsers({ search, limit: 100 });
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (targetUser: User) => {
    if (currentUser?.id === targetUser.id) {
      toast.error('Không thể tự khóa tài khoản của chính mình!');
      return;
    }

    try {
      const newStatus = !targetUser.is_active;
      await updateUserStatus(targetUser.id, { is_active: newStatus });
      toast.success(`Đã ${newStatus ? 'mở khóa' : 'khóa'} tài khoản thành công`);
      // Update local state
      setUsers(users.map(u => u.id === targetUser.id ? { ...u, is_active: newStatus } : u));
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Lỗi khi cập nhật trạng thái');
    }
  };

  const activeCount = users.filter(u => u.is_active).length;
  const bannedCount = users.filter(u => !u.is_active).length;

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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    fetchUsers();
                  }
                }}
                className="pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-64 bg-white"
              />
            </div>
            <div className="flex gap-2">
              <span className="text-sm font-medium text-zinc-500 bg-zinc-100 px-3 py-1.5 rounded-md">
                Active: {activeCount}
              </span>
              <span className="text-sm font-medium text-red-500 bg-red-50 px-3 py-1.5 rounded-md">
                Banned: {bannedCount}
              </span>
            </div>
          </div>
          
          <div className="overflow-x-auto min-h-[300px]">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase tracking-wider text-zinc-500 font-bold">
                    <th className="px-6 py-4">Người dùng</th>
                    <th className="px-6 py-4">Vai trò</th>
                    <th className="px-6 py-4">Ngày tham gia</th>
                    <th className="px-6 py-4 text-center">Trạng thái</th>
                    <th className="px-6 py-4 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-zinc-500 text-sm">
                        Không tìm thấy người dùng nào
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-600">
                              {(user.full_name || 'U').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-zinc-900">{user.full_name || 'No Name'}</div>
                              <div className="text-xs text-zinc-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600 capitalize">
                          {user.role}
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-600">
                          {new Date(user.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                            user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {user.is_active ? 'Active' : 'Banned'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {currentUser?.id === user.id ? (
                              <span className="text-xs text-zinc-400 italic">Me</span>
                            ) : (
                              <button 
                                onClick={() => handleToggleStatus(user)}
                                className={`p-1.5 rounded-md transition-colors ${
                                  user.is_active 
                                    ? 'text-red-600 hover:bg-red-50' 
                                    : 'text-green-600 hover:bg-green-50'
                                }`} 
                                title={user.is_active ? "Ban" : "Unban"}
                              >
                                {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </AdminPageLayout>
  );
}
