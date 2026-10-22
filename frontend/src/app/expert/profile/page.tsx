"use client";

import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Settings, 
  FileText, 
  Loader2, 
  Save, 
  Mail, 
  User as UserIcon,
  AlertCircle
} from 'lucide-react';
import { getExpertProfile, updateExpertAvailability } from '@/services/expert';
import { useAuth } from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { ExpertProfile } from '@/types';

export default function ExpertProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ExpertProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [isAvailable, setIsAvailable] = useState(false);
  const [maxReviews, setMaxReviews] = useState(5);
  const [bio, setBio] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  async function fetchProfile() {
    try {
      setLoading(true);
      const data = await getExpertProfile();
      setProfile(data);
      setIsAvailable(data.is_available);
      setMaxReviews(data.max_active_reviews);
      setBio(data.bio || '');
    } catch (err: any) {
      toast.error('Không thể tải thông tin hồ sơ Chuyên gia');
    } finally {
      setLoading(false);
    }
  }

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateExpertAvailability({
        is_available: isAvailable,
        max_active_reviews: Number(maxReviews),
        bio: bio.trim() || undefined
      });
      setProfile(updated);
      toast.success('Đã cập nhật trạng thái khả dụng thành công!');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Lỗi khi cập nhật trạng thái');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Hồ sơ Chuyên gia & Trạng thái Nhận bài</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Quản lý trạng thái sẵn sàng chấm bài (Available / Unavailable), chỉ tiêu bài chấm và giới thiệu chuyên môn (UC-14).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Quick Status */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 text-center space-y-4">
            <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-3xl font-bold text-[#932120] mx-auto shadow-2xs">
              {(profile?.full_name || 'E').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">{profile?.full_name || 'Chuyên gia'}</h2>
              <p className="text-xs text-zinc-500">{profile?.email}</p>
            </div>

            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              profile?.is_available ? 'bg-green-100 text-green-700' : 'bg-zinc-100 text-zinc-600'
            }`}>
              <span className={`w-2 h-2 rounded-full ${profile?.is_available ? 'bg-green-500' : 'bg-zinc-400'}`}></span>
              {profile?.is_available ? 'Đang Sẵn sàng nhận bài' : 'Tạm dừng nhận bài'}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-3">
            <h3 className="font-bold text-sm text-zinc-800">Tải công việc hiện tại</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-600">
                <span>Bài đang chấm / Tối đa:</span>
                <span className="font-bold text-zinc-900">
                  {profile?.active_reviews_count || 0} / {profile?.max_active_reviews || 5} bài
                </span>
              </div>
              <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-[#932120] h-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100, 
                      ((profile?.active_reviews_count || 0) / (profile?.max_active_reviews || 5)) * 100
                    )}%`
                  }}
                />
              </div>
              <p className="text-[11px] text-zinc-500 italic">
                Hệ thống chỉ tự động phân công thêm khi bạn bật Available và số bài đang nhận chưa chạm giới hạn.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Settings Form (UC-14) */}
        <div className="md:col-span-2">
          <form onSubmit={handleSaveAvailability} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Settings className="w-5 h-5 text-[#932120]" />
              <h3 className="font-bold text-zinc-900">Cấu hình Trạng thái Khả dụng (Availability)</h3>
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center justify-between p-4 bg-red-50/40 rounded-xl border border-red-100">
              <div className="space-y-0.5">
                <label className="text-sm font-bold text-zinc-900 cursor-pointer">
                  Trạng thái nhận bài mới (Available)
                </label>
                <p className="text-xs text-zinc-500">
                  {isAvailable 
                    ? 'Bạn đang sẵn sàng tiếp nhận các bài Mock Test Writing/Speaking hoặc yêu cầu chấm lại từ học viên.'
                    : 'Tạm thời không nhận bài mới. Các bài đã gán trước đó vẫn giữ nguyên để chấm hoàn tất.'
                  }
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAvailable(!isAvailable)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isAvailable ? 'bg-[#932120]' : 'bg-zinc-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAvailable ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Max reviews */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1.5">
                Số bài nhận chấm đồng thời tối đa (1 - 20 bài)
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxReviews}
                onChange={(e) => setMaxReviews(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120]"
              />
              <p className="text-xs text-zinc-500 mt-1">
                Khi số bài đang chờ chấm đạt mốc này, hệ thống sẽ tạm dừng phân công bài mới cho bạn.
              </p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold text-zinc-700 uppercase mb-1.5">
                Giới thiệu & Bằng cấp chuyên môn (Bio)
              </label>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Ví dụ: IELTS 8.5 Overall (Writing 8.0, Speaking 8.5), Cựu giảng viên tiếng Anh..."
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120]"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 bg-[#932120] hover:bg-[#7a1a19] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu cấu hình
              </button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
