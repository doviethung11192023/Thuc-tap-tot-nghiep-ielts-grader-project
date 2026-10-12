"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  UserCheck, 
  UserX, 
  Loader2, 
  UserPlus, 
  X, 
  GraduationCap, 
  ShieldCheck, 
  User as UserIcon,
  Copy,
  Check,
  Mail,
  Clock,
  CheckCircle2,
  Info,
  MailCheck,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight
} from 'lucide-react';
import { 
  getAdminUsers, 
  updateUserStatus, 
  adminCreateExpert, 
  adminCreateAdmin,
  resendUserInvite 
} from '@/services/users';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { User, UserRole } from '@/types';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [resendingId, setResendingId] = useState<string | null>(null);

  // Pagination State (UC-19)
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalRole, setModalRole] = useState<'admin' | 'expert'>('expert');
  const [accountEmail, setAccountEmail] = useState('');
  const [accountName, setAccountName] = useState('');
  const [expertBio, setExpertBio] = useState('');
  const [expertMaxReviews, setExpertMaxReviews] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{ email: string; role: 'admin' | 'expert'; setup_link?: string | null } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Debounce search input để tối ưu hiệu năng gọi API
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1); // Tự động reset về trang 1 khi từ khóa tìm kiếm thay đổi
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);
  
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = { 
        page, 
        limit: pageSize 
      };
      if (debouncedSearch.trim()) params.search = debouncedSearch.trim();
      if (selectedRole !== 'all') params.role = selectedRole;
      
      const data = await getAdminUsers(params);
      setUsers(data.items || []);
      setTotal(data.total || 0);
    } catch (error: any) {
      if (error.response?.status === 403) {
        toast.error(error.response?.data?.detail || '403 Forbidden: Tài khoản không có quyền Quản trị viên (Admin)');
      } else {
        toast.error('Không thể tải danh sách người dùng');
      }
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, debouncedSearch, selectedRole]);

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

  const handleResendInvite = async (targetUser: User) => {
    setResendingId(targetUser.id);
    try {
      await resendUserInvite(targetUser.id);
      toast.success(`Đã gửi lại thư mời kích hoạt tới ${targetUser.email}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Không thể gửi lại thư mời kích hoạt');
    } finally {
      setResendingId(null);
    }
  };

  const handleOpenModal = (role: 'admin' | 'expert') => {
    setModalRole(role);
    setIsModalOpen(true);
    setAccountEmail('');
    setAccountName('');
    setExpertBio('');
    setExpertMaxReviews(5);
    setCreatedResult(null);
    setCopiedLink(false);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountEmail.trim() || !accountName.trim()) {
      toast.error('Vui lòng điền đầy đủ Email và Họ tên');
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalRole === 'admin') {
        const res = await adminCreateAdmin({
          email: accountEmail.trim(),
          full_name: accountName.trim()
        });
        toast.success('Đã gửi email kích hoạt và tạo tài khoản Admin!');
        setCreatedResult({
          email: accountEmail.trim(),
          role: 'admin',
          setup_link: res.data?.setup_link
        });
      } else {
        const res = await adminCreateExpert({
          email: accountEmail.trim(),
          full_name: accountName.trim(),
          bio: expertBio.trim() || undefined,
          max_active_reviews: Number(expertMaxReviews) || 5
        });
        toast.success('Đã gửi email kích hoạt và tạo tài khoản Expert!');
        setCreatedResult({
          email: accountEmail.trim(),
          role: 'expert',
          setup_link: res.data?.setup_link
        });
      }
      fetchUsers();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || `Lỗi khi tạo tài khoản ${modalRole === 'admin' ? 'Admin' : 'Expert'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setAccountEmail('');
    setAccountName('');
    setExpertBio('');
    setExpertMaxReviews(5);
    setCreatedResult(null);
    setCopiedLink(false);
  };

  const activeCount = users.filter(u => u.is_active).length;
  const bannedCount = users.filter(u => !u.is_active).length;

  // Tính toán số lượng trang
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // Tự động căn chỉnh trang hợp lệ khi dữ liệu lọc thay đổi
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  // Tạo dải số trang hiển thị thông minh kèm dấu ba chấm (...)
  const getPageNumbers = () => {
    const delta = 1;
    const range: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) range.push(i);
      return range;
    }

    const left = Math.max(2, page - delta);
    const right = Math.min(totalPages - 1, page + delta);

    range.push(1);

    if (left > 2) {
      range.push('...');
    }

    for (let i = left; i <= right; i++) {
      range.push(i);
    }

    if (right < totalPages - 1) {
      range.push('...');
    }

    range.push(totalPages);
    return range;
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const roleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            <ShieldCheck className="w-3 h-3" /> Admin
          </span>
        );
      case 'expert':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#932120]/10 text-[#932120] border border-[#932120]/20">
            <GraduationCap className="w-3 h-3 text-[#932120]" /> Expert
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            <UserIcon className="w-3 h-3" /> Student
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Quản lý Tài khoản & Phân quyền</h1>
          <p className="text-sm text-zinc-500 mt-1">Danh sách người dùng theo vai trò, quản trị khóa tài khoản và cấp quyền Quản trị viên / Chuyên gia</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => handleOpenModal('admin')}
            className="inline-flex items-center gap-2 bg-zinc-900 hover:bg-black text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors border border-zinc-800"
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            Tạo tài khoản Admin
          </button>
          <button
            onClick={() => handleOpenModal('expert')}
            className="inline-flex items-center gap-2 bg-[#932120] hover:bg-[#7a1a19] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Tạo tài khoản Expert
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="flex border-b border-zinc-200 gap-6 text-sm font-medium">
        {[
          { id: 'all', label: 'Tất cả' },
          { id: 'student', label: 'Học viên (Student)' },
          { id: 'expert', label: 'Chuyên gia (Expert)' },
          { id: 'admin', label: 'Quản trị viên (Admin)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setSelectedRole(tab.id);
              setPage(1);
            }}
            className={`pb-3 font-bold border-b-2 transition-colors ${
              selectedRole === tab.id
                ? 'border-[#932120] text-[#932120]'
                : 'border-transparent text-zinc-500 hover:text-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-zinc-50/50">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm email, họ tên..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  fetchUsers();
                }
              }}
              className="pl-9 pr-4 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 bg-white placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-full"

            />
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="text-xs font-semibold text-zinc-700 bg-zinc-100 border border-zinc-200/60 px-3 py-1.5 rounded-md">
              Tổng cộng: {total}
            </span>
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200/60 px-3 py-1.5 rounded-md">
              Hoạt động (trang này): {activeCount}
            </span>
            <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200/60 px-3 py-1.5 rounded-md">
              Bị khóa (trang này): {bannedCount}
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
                  <th className="px-6 py-4 text-center">Kích hoạt</th>
                  <th className="px-6 py-4 text-center">Trạng thái</th>
                  <th className="px-6 py-4">Ngày tham gia</th>
                  <th className="px-6 py-4 text-center w-36">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500 text-sm">
                      Không tìm thấy người dùng nào phù hợp
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-xs font-bold text-zinc-700">
                            {(u.full_name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-zinc-900">{u.full_name || 'Chưa đặt tên'}</div>
                            <div className="text-xs text-zinc-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {roleBadge(u.role)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {u.is_activated !== false ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã kích hoạt
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Chờ kích hoạt
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold ${
                          u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {u.is_active ? 'Active' : 'Locked'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-600">
                        {new Date(u.created_at).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-4 text-center w-36">
                        <div className="flex items-center justify-center">
                          {currentUser?.id === u.id ? (
                            <span className="px-2.5 py-1 text-xs font-semibold text-zinc-400 bg-zinc-100 rounded-lg border border-zinc-200/60 inline-flex items-center">
                              Tài khoản này
                            </span>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              {/* Slot 1: Gửi lại email kích hoạt (Cố định width w-8 h-8 để cột luôn thẳng hàng) */}
                              {u.is_activated === false ? (
                                <button
                                  onClick={() => handleResendInvite(u)}
                                  disabled={resendingId === u.id}
                                  className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-blue-600 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-700 border border-blue-200/60 transition-all shadow-2xs disabled:opacity-50"
                                  title="Gửi lại thư mời kích hoạt & đặt mật khẩu"
                                >
                                  {resendingId === u.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                                  ) : (
                                    <Mail className="w-4 h-4" />
                                  )}
                                </button>
                              ) : (
                                <div className="w-8 h-8" aria-hidden="true" />
                              )}

                              {/* Slot 2: Khóa / Mở khóa tài khoản (Cố định vị trí tuyệt đối) */}
                              <button 
                                onClick={() => handleToggleStatus(u)}
                                className={`w-8 h-8 rounded-lg inline-flex items-center justify-center transition-all shadow-2xs ${
                                  u.is_active 
                                    ? 'text-red-600 bg-red-50/80 hover:bg-red-100 hover:text-red-700 border border-red-200/60' 
                                    : 'text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100 hover:text-emerald-800 border border-emerald-200/60'
                                }`} 
                                title={u.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                              >
                                {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                              </button>
                            </div>
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

        {/* Thanh Điều Hướng Phân Trang (Pagination Controls - UC-19) */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/50 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Thông tin số lượng hiển thị */}
          <div className="text-xs sm:text-sm text-zinc-600 font-medium text-center md:text-left">
            {total === 0 ? (
              <span>Không có người dùng nào</span>
            ) : (
              <span>
                Đang xem <span className="font-bold text-zinc-900">{(page - 1) * pageSize + 1}</span> - <span className="font-bold text-zinc-900">{Math.min(page * pageSize, total)}</span> trên tổng số <span className="font-bold text-zinc-900">{total}</span> người dùng
              </span>
            )}
          </div>

          {/* Chọn số dòng mỗi trang & Các nút chuyển trang */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {/* Lựa chọn số hàng trên mỗi trang */}
            <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-600">
              <span className="font-medium whitespace-nowrap">Hiển thị:</span>
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                disabled={loading}
                className="px-2.5 py-1.5 bg-white border border-zinc-300 rounded-lg text-xs sm:text-sm font-semibold text-zinc-800 focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
              >
                <option value={10}>10 / trang</option>
                <option value={20}>20 / trang</option>
                <option value={50}>50 / trang</option>
              </select>
            </div>

            {/* Cụm nút chuyển trang */}
            <div className="flex items-center gap-1.5 select-none">
              {/* Trang đầu tiên */}
              <button
                onClick={() => setPage(1)}
                disabled={page <= 1 || loading}
                title="Trang đầu"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              {/* Trang trước */}
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page <= 1 || loading}
                title="Trang trước"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Danh sách các trang */}
              <div className="flex items-center gap-1">
                {getPageNumbers().map((p, idx) => {
                  if (typeof p === 'string') {
                    return (
                      <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs text-zinc-400 font-bold select-none">
                        ...
                      </span>
                    );
                  }
                  const isCurrent = p === page;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      disabled={loading}
                      className={`w-8 h-8 rounded-lg text-xs font-bold transition-all shadow-2xs flex items-center justify-center ${
                        isCurrent
                          ? 'bg-[#932120] text-white border border-[#932120] hover:bg-[#7a1a19]'
                          : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-100 hover:text-zinc-900'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Trang kế tiếp */}
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages || loading}
                title="Trang kế tiếp"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {/* Trang cuối cùng */}
              <button
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || loading}
                title="Trang cuối"
                className="w-8 h-8 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-40 disabled:pointer-events-none transition-all shadow-2xs"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tạo tài khoản Admin / Expert (UC-19) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {!createdResult ? (
              <form onSubmit={handleCreateAccount} className="space-y-4">
                {/* Role Tabs inside Modal */}
                <div className="flex border-b border-zinc-200 mb-2">
                  <button
                    type="button"
                    onClick={() => setModalRole('admin')}
                    className={`flex-1 pb-2.5 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                      modalRole === 'admin'
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-500" />
                    Quản trị viên (Admin)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalRole('expert')}
                    className={`flex-1 pb-2.5 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
                      modalRole === 'expert'
                        ? 'border-[#932120] text-[#932120]'
                        : 'border-transparent text-zinc-400 hover:text-zinc-600'
                    }`}
                  >
                    <GraduationCap className="w-4 h-4 text-[#932120]" />
                    Chuyên gia (Expert)
                  </button>
                </div>

                <div className="flex items-center gap-2.5 text-zinc-900">
                  {modalRole === 'admin' ? (
                    <ShieldCheck className="w-6 h-6 text-amber-500" />
                  ) : (
                    <GraduationCap className="w-6 h-6 text-[#932120]" />
                  )}
                  <h3 className="text-lg font-bold">
                    {modalRole === 'admin' ? 'Tạo tài khoản Quản trị viên (Admin)' : 'Tạo tài khoản Chuyên gia (Expert)'}
                  </h3>
                </div>

                <p className="text-xs text-zinc-500">
                  {modalRole === 'admin' 
                    ? 'Tài khoản có toàn quyền quản trị hệ thống, bài thi, người dùng và phân quyền trong nền tảng.'
                    : 'Tài khoản được gán vai trò Chuyên gia để chấm bài Writing & Speaking và phản hồi học viên.'}
                </p>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Email {modalRole === 'admin' ? 'Admin' : 'Chuyên gia'} *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder={modalRole === 'admin' ? "admin@example.com" : "expert@example.com"}
                    value={accountEmail}
                    onChange={(e) => setAccountEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 bg-white placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                    Họ và tên *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={modalRole === 'admin' ? "Admin Quản Trị" : "Thầy Cô / Chuyên Gia A"}
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 bg-white placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                  />
                </div>

                {modalRole === 'expert' && (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                        Số bài chấm đồng thời tối đa
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={expertMaxReviews}
                        onChange={(e) => setExpertMaxReviews(Number(e.target.value))}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 bg-white placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                        Tiểu sử / Bằng cấp chuyên môn (Bio)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="IELTS 8.5 Overall, 5 năm kinh nghiệm chấm thi..."
                        value={expertBio}
                        onChange={(e) => setExpertBio(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-900 bg-white placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                      />
                    </div>
                  </>
                )}

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 border border-zinc-200 text-zinc-700 rounded-lg text-sm font-semibold hover:bg-zinc-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-5 py-2 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2 ${
                      modalRole === 'admin' ? 'bg-zinc-900 hover:bg-black' : 'bg-[#932120] hover:bg-[#7a1a19]'
                    }`}
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Xác nhận Tạo {modalRole === 'admin' ? 'Admin' : 'Expert'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-2">
                  <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                    <MailCheck className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-bold text-zinc-900">
                    Đã tạo tài khoản & Gửi thư kích hoạt!
                  </h3>
                  <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
                    Hệ thống đã gửi email kèm nút kích hoạt tài khoản {createdResult.role === 'admin' ? 'Quản trị viên (Admin)' : 'Chuyên gia (Expert)'} tới{' '}
                    <strong className="text-zinc-900 font-bold">{createdResult.email}</strong>.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Hướng dẫn người dùng kích hoạt:</p>
                    <p className="text-blue-700">
                      Người nhận chỉ cần mở email và bấm <strong>"Kích hoạt tài khoản"</strong> để thiết lập mật khẩu mới, hoặc có thể chọn <strong>"Liên kết bằng Google"</strong> để đăng nhập ngay mà không cần nhớ mật khẩu.
                    </p>
                  </div>
                </div>

                {createdResult.setup_link && (
                  <details className="text-left border border-zinc-200 rounded-lg p-3 bg-zinc-50/50">
                    <summary className="text-xs font-bold text-zinc-700 cursor-pointer hover:text-zinc-900 select-none">
                      Tùy chọn: Sao chép liên kết kích hoạt dự phòng (Fallback Link)
                    </summary>
                    <div className="mt-2.5 space-y-1.5 pt-2 border-t border-zinc-200/60">
                      <div className="flex justify-between items-center text-xs font-semibold text-zinc-600">
                        <span>Liên kết điều hướng trực tiếp tới trang đặt mật khẩu:</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(createdResult.setup_link || '');
                            setCopiedLink(true);
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          className="inline-flex items-center gap-1 text-[#932120] hover:underline font-bold"
                        >
                          {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedLink ? 'Đã sao chép' : 'Sao chép link'}
                        </button>
                      </div>
                      <div className="text-xs text-zinc-500 font-mono break-all line-clamp-2 bg-white p-2 rounded border border-zinc-200">
                        {createdResult.setup_link}
                      </div>
                    </div>
                  </details>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-5 py-2 bg-[#932120] text-white rounded-lg text-sm font-bold hover:bg-[#7a1a19] shadow-sm transition-colors"
                  >
                    Hoàn tất
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
