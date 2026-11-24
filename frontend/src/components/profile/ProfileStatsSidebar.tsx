"use client";

import React from 'react';
import Link from 'next/link';
import { Award, BookOpen, Camera, Clock, Flame, Loader2, Medal, Mic } from 'lucide-react';
import type { User } from '@/types';
import type { AdaptiveStreakData, LearnerBadgesData } from '@/types/learning-profile';

export interface ProfileAchievementStats {
  totalCompleted: number;
  highestOverall: number;
  latestSubmit: string;
}

interface ProfileStatsSidebarProps {
  user: User;
  stats: ProfileAchievementStats;
  loadingStats: boolean;
  hasVoiceConsent: boolean;
  isUpdatingConsent: boolean;
  onToggleVoiceConsent: () => void;
  streak?: AdaptiveStreakData;
  badges?: LearnerBadgesData;
}

export function ProfileStatsSidebar({
  user,
  stats,
  loadingStats,
  hasVoiceConsent,
  isUpdatingConsent,
  onToggleVoiceConsent,
  streak,
  badges,
}: ProfileStatsSidebarProps) {
  const initial = user.full_name ? user.full_name.charAt(0).toUpperCase() : 'U';

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-6 flex flex-col items-center text-center">
        <div className="relative group cursor-pointer mb-4">
          <div className="w-24 h-24 bg-zinc-100 rounded-full border-4 border-white shadow-md flex items-center justify-center text-3xl font-bold text-[#932120]">
            {initial}
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="w-6 h-6 text-white" />
          </div>
        </div>
        <h2 className="text-lg font-bold text-zinc-900">{user.full_name || 'Học viên'}</h2>
        <p className="text-sm text-zinc-500">{user.email}</p>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 bg-[#932120]/10 text-[#932120] text-xs font-bold rounded-full capitalize">
          <span className="w-2 h-2 rounded-full bg-[#932120]" />
          {user.role} Active
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 bg-zinc-50">
          <h3 className="font-bold text-zinc-800 text-sm">Tổng quan Thành tích (4 kỹ năng)</h3>
        </div>
        <div className="p-4 space-y-4">
          {loadingStats ? (
            <div className="flex justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-600 text-sm">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span>Overall cao nhất</span>
                </div>
                <span className="font-black text-lg text-[#932120]">
                  {stats.highestOverall > 0 ? stats.highestOverall.toFixed(1) : '-'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-600 text-sm">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  <span>Tổng bài đã hoàn thành</span>
                </div>
                <span className="font-bold text-zinc-900">{stats.totalCompleted}</span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-zinc-600 text-sm">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  <span>Lần nộp gần nhất</span>
                </div>
                <span className="font-medium text-xs text-zinc-500">{stats.latestSubmit}</span>
              </div>
              {(streak || badges) && (
                <div className="pt-3 border-t border-zinc-100 space-y-2">
                  {streak && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2 text-zinc-600">
                        <Flame className="w-4 h-4 text-[#932120]" /> Chuỗi học ({streak.daily_target_minutes}p/ngày)
                      </span>
                      <span className="font-bold text-[#932120]">{streak.current_streak} ngày</span>
                    </div>
                  )}
                  {badges && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2 text-zinc-600">
                        <Medal className="w-4 h-4 text-amber-500" /> Huy hiệu đạt được
                      </span>
                      <Link href="/learning-profile" className="font-bold text-zinc-900 hover:text-[#932120] underline-offset-2 hover:underline">
                        {badges.summary.unlocked_count}/{badges.summary.total_count}
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2 text-zinc-900 font-bold text-sm">
          <Mic className="w-4 h-4 text-[#932120]" />
          <span>Quyền riêng tư giọng nói</span>
        </div>
        <p className="text-xs text-zinc-500">
          Cho phép hệ thống AI thu âm và phân tích âm vị học cho phòng thi Speaking (tuân thủ Nghị định 13/2023/NĐ-CP).
        </p>
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs font-medium text-zinc-700">
            {hasVoiceConsent ? 'Đã cấp phép ghi âm' : 'Chưa cấp phép'}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={hasVoiceConsent}
            aria-label="Cấp phép thu âm giọng nói Speaking"
            onClick={onToggleVoiceConsent}
            disabled={isUpdatingConsent}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#932120] ${
              hasVoiceConsent ? 'bg-[#932120]' : 'bg-zinc-200'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                hasVoiceConsent ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
