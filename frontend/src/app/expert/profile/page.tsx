"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Lock, Save, Settings } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { getExpertPerformance, getExpertProfile, updateExpertAvailability } from "@/services/expert";
import { extractApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";
import type { ExpertPerformanceDetail, ExpertProfile } from "@/types";
import { ExpertRpsCard } from "@/components/expert/ExpertRpsCard";
import { BlurFadeCard, SpotlightCard } from "@/components/motion";

function formatVnDate(iso?: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "Asia/Ho_Chi_Minh",
    });
  } catch {
    return iso;
  }
}

export default function ExpertProfilePage() {
  const prefersReduced = useReducedMotion();
  const queryClient = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);

  const [isAvailable, setIsAvailable] = useState(false);
  const [maxReviews, setMaxReviews] = useState(5);
  const [bio, setBio] = useState("");

  const { data: profile = null, isLoading: loading } = useQuery<ExpertProfile>({
    queryKey: ["expert-profile"],
    queryFn: getExpertProfile,
    staleTime: 2 * 60 * 1000,
  });

  const { data: performance = null } = useQuery<ExpertPerformanceDetail>({
    queryKey: ["expert-performance-me"],
    queryFn: getExpertPerformance,
    staleTime: 2 * 60 * 1000,
  });

  const profileSyncKey = profile
    ? `${profile.user_id}:${profile.is_available}:${profile.max_active_reviews}:${profile.bio ?? ""}`
    : "";
  const [syncedKey, setSyncedKey] = useState("");
  if (profile && syncedKey !== profileSyncKey) {
    setSyncedKey(profileSyncKey);
    setIsAvailable(profile.is_available);
    setMaxReviews(profile.max_active_reviews);
    setBio(profile.bio || "");
  }

  const [nowMs] = useState(() => Date.now());
  const tierMaxCap = profile?.tier_max_reviews ?? performance?.tier_max_reviews ?? 5;
  const isCooldownLocked = Boolean(
    profile?.is_suspended_by_penalty ||
      (profile?.cooldown_until && new Date(profile.cooldown_until).getTime() > nowMs),
  );
  const cooldownFormatted = formatVnDate(profile?.cooldown_until);

  const handleSaveAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await updateExpertAvailability({
        is_available: isCooldownLocked ? false : isAvailable,
        max_active_reviews: Math.min(Number(maxReviews), tierMaxCap),
        bio: bio.trim() || undefined,
      });
      queryClient.setQueryData(["expert-profile"], updated);
      toast.success("Đã cập nhật trạng thái khả dụng thành công!");
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Lỗi khi cập nhật trạng thái"));
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
        <h1 className="text-2xl font-bold text-zinc-900">Hồ sơ Chuyên gia &amp; Trạng thái Nhận bài</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Quản lý trạng thái sẵn sàng chấm bài, chỉ tiêu bài chấm theo hạng và hiệu suất 30 ngày (UC-14).
        </p>
      </div>

      {isCooldownLocked && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-300 flex items-start gap-3 text-rose-900 shadow-xs">
          <Lock className="w-5 h-5 text-[#932120] shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold text-sm">
              {profile?.is_suspended_by_penalty
                ? "Tài khoản đang bị tạm ngưng điều phối tự động do vi phạm SLA"
                : "Tài khoản đang trong thời gian tạm nghỉ điều phối (Cooldown)"}
            </p>
            <p>
              {cooldownFormatted
                ? `Mở lại dự kiến: ${cooldownFormatted} (GMT+7). `
                : ""}
              Bạn không thể tự bật Sẵn sàng nhận bài trong thời gian này. Vui lòng hoàn tất các bài còn lại hoặc liên hệ Admin.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-6">
          <BlurFadeCard inView={false} index={0}>
            <SpotlightCard
              tone={profile?.is_available ? "emerald" : "crimson"}
              className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 text-center space-y-4 overflow-hidden"
            >
              <div className="w-20 h-20 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-3xl font-bold text-[#932120] mx-auto shadow-2xs relative z-10">
                {(profile?.full_name || "E").charAt(0).toUpperCase()}
              </div>
              <div className="relative z-10">
                <h2 className="text-lg font-bold text-zinc-900">{profile?.full_name || "Chuyên gia"}</h2>
                <p className="text-xs text-zinc-500">{profile?.email}</p>
              </div>
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold relative z-10 ${
                  profile?.is_available ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${profile?.is_available ? "bg-emerald-500" : "bg-zinc-400"}`} />
                {profile?.is_available ? "Đang Sẵn sàng nhận bài" : "Tạm dừng nhận bài"}
              </div>
            </SpotlightCard>
          </BlurFadeCard>

          <BlurFadeCard inView={false} index={1}>
            <SpotlightCard tone="crimson" className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-3 overflow-hidden">
              <h3 className="font-bold text-sm text-zinc-800 relative z-10">Tải công việc hiện tại</h3>
              <div className="space-y-2 relative z-10">
                <div className="flex justify-between text-xs text-zinc-600">
                  <span>Bài đang chấm / Tối đa:</span>
                  <span className="font-bold text-zinc-900 tabular-nums font-mono">
                    {profile?.active_reviews_count || 0} / {profile?.max_active_reviews || 5} bài
                  </span>
                </div>
                <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden">
                  <m.div
                    initial={prefersReduced ? false : { width: 0 }}
                    animate={{
                      width: `${Math.min(
                        100,
                        ((profile?.active_reviews_count || 0) / (profile?.max_active_reviews || 5)) * 100,
                      )}%`,
                    }}
                    transition={{ duration: 0.65, ease: "easeOut" }}
                    className="bg-[#932120] h-full rounded-full"
                    style={
                      prefersReduced
                        ? {
                            width: `${Math.min(
                              100,
                              ((profile?.active_reviews_count || 0) / (profile?.max_active_reviews || 5)) * 100,
                            )}%`,
                          }
                        : undefined
                    }
                  />
                </div>
                {profile?.tier === "probation" && (
                  <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Chuỗi bài chuẩn phục hồi: {profile.consecutive_clean_reviews ?? 0}/3
                  </p>
                )}
              </div>
            </SpotlightCard>
          </BlurFadeCard>

          <BlurFadeCard inView={false} index={2}>
            <ExpertRpsCard rps={profile?.rps_summary} performance={performance} />
          </BlurFadeCard>
        </div>

        <BlurFadeCard inView={false} index={3} className="md:col-span-2">
          <form onSubmit={handleSaveAvailability} className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2 border-b border-zinc-100 pb-3">
              <Settings className="w-5 h-5 text-[#932120]" />
              <h3 className="font-bold text-zinc-900">Cấu hình Trạng thái Khả dụng (Availability)</h3>
            </div>

            <div className="flex items-center justify-between p-4 bg-red-50/40 rounded-xl border border-red-100">
              <div className="space-y-0.5 pr-4">
                <span className="text-sm font-bold text-zinc-900 block">Trạng thái nhận bài mới (Available)</span>
                <p className="text-xs text-zinc-500">
                  {isCooldownLocked
                    ? "Bị khóa tự động trong thời gian tạm nghỉ điều phối."
                    : isAvailable
                      ? "Bạn đang sẵn sàng tiếp nhận bài Mock Test & Practice từ hàng đợi."
                      : "Tạm thời không nhận bài mới. Các bài đã gán trước đó vẫn giữ nguyên."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Bật tắt trạng thái nhận bài mới"
                disabled={isCooldownLocked}
                onClick={() => setIsAvailable(!isAvailable)}
                className={`relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isCooldownLocked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                } ${isAvailable && !isCooldownLocked ? "bg-[#932120]" : "bg-zinc-300"}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isAvailable && !isCooldownLocked ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div>
              <label htmlFor="expert-max-reviews" className="block text-xs font-bold text-zinc-700 uppercase mb-1.5">
                Số bài nhận chấm đồng thời tối đa (1 - {tierMaxCap} bài theo hạng {profile?.tier || "standard"})
              </label>
              <input
                id="expert-max-reviews"
                type="number"
                min={1}
                max={tierMaxCap}
                value={maxReviews}
                onChange={(e) => setMaxReviews(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-lg text-sm font-mono tabular-nums focus:outline-none focus:border-[#932120]"
              />
            </div>

            <div>
              <label htmlFor="expert-bio" className="block text-xs font-bold text-zinc-700 uppercase mb-1.5">
                Giới thiệu &amp; Bằng cấp chuyên môn (Bio)
              </label>
              <textarea
                id="expert-bio"
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
                className="inline-flex items-center gap-2 bg-[#932120] hover:bg-[#7a1a19] text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu cấu hình
              </button>
            </div>
          </form>
        </BlurFadeCard>
      </div>
    </div>
  );
}
