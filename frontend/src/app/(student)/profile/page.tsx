"use client";

import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { extractApiErrorMessage } from '@/lib/api-error';
import { getMyProfile, updateProfile, getLearnerGoals, updateLearnerGoals } from '@/services/users';
import { getLearningProfileOverview } from '@/services/learning-profile';
import type { AdaptiveStreakData, LearnerBadgesData } from '@/types/learning-profile';

interface AttemptRow {
  submitted_at: string | null;
  band: number | null;
  status: string | null;
}
import { toast } from "sonner";
import { BlurFadeCard } from '@/components/motion';
import { ProfileStatsSidebar, type ProfileAchievementStats } from '@/components/profile/ProfileStatsSidebar';
import { ProfileGoalsCard, type ProfileGoalsState } from '@/components/profile/ProfileGoalsCard';
import { ProfileAccountForm } from '@/components/profile/ProfileAccountForm';
import { ProfilePasswordForm } from '@/components/profile/ProfilePasswordForm';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const [newName, setNewName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [stats, setStats] = useState<ProfileAchievementStats>({
    totalCompleted: 0,
    highestOverall: 0,
    latestSubmit: '-',
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [streak, setStreak] = useState<AdaptiveStreakData | undefined>(undefined);
  const [badges, setBadges] = useState<LearnerBadgesData | undefined>(undefined);
  const [goals, setGoals] = useState<ProfileGoalsState>({
    target_overall: 6.5,
    target_listening: 6.5,
    target_reading: 6.5,
    target_writing: 6.5,
    target_speaking: 6.5,
    test_date: '',
  });
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [isSavingGoals, setIsSavingGoals] = useState(false);
  const [hasVoiceConsent, setHasVoiceConsent] = useState(false);
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadProfileData = async () => {
      try {
        const [meRes, goalRes, attemptsRes, overviewRes] = await Promise.all([
          getMyProfile().catch(() => null),
          getLearnerGoals().catch(() => null),
          supabase
            .from('attempt_results')
            .select('band, submitted_at, status')
            .eq('learner_id', user.id)
            .not('submitted_at', 'is', null),
          getLearningProfileOverview().catch(() => null),
        ]);
        if (cancelled) return;

        if (overviewRes) {
          setStreak(overviewRes.adaptive_streak);
          setBadges(overviewRes.badges);
        }

        setNewName(meRes?.full_name || user.full_name || '');
        setHasVoiceConsent(
          meRes ? Boolean(meRes.voice_consent_at) : Boolean(user.voice_consent_at)
        );

        if (goalRes) {
          setGoals({
            target_overall: goalRes.target_overall ?? 6.5,
            target_listening: goalRes.target_listening ?? 6.5,
            target_reading: goalRes.target_reading ?? 6.5,
            target_writing: goalRes.target_writing ?? 6.5,
            target_speaking: goalRes.target_speaking ?? 6.5,
            test_date: goalRes.test_date ?? '',
          });
        }

        const rawRows = (attemptsRes.data || []) as AttemptRow[];
        const rows = rawRows
          .map((a) => ({
            submitted_at: String(a.submitted_at || ''),
            band: Number(a.band || 0),
            status: a.status,
          }))
          .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));

        if (rows.length > 0) {
          const latestDate = new Date(rows[0].submitted_at).toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          setStats({
            totalCompleted: rows.length,
            highestOverall: Math.max(...rows.map((r) => r.band)),
            latestSubmit: latestDate,
          });
        } else {
          setStats({ totalCompleted: 0, highestOverall: 0, latestSubmit: '-' });
        }
      } finally {
        if (!cancelled) {
          setLoadingStats(false);
          setLoadingGoals(false);
        }
      }
    };

    void loadProfileData();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.full_name, user?.voice_consent_at]);

  const handleUpdateName = async () => {
    if (!newName.trim()) return void toast.error('Vui lòng nhập họ và tên');
    setIsUpdatingName(true);
    try {
      await updateProfile({ full_name: newName.trim() });
      toast.success('Cập nhật tên thành công!');
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, 'Có lỗi xảy ra khi cập nhật tên'));
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleToggleVoiceConsent = async () => {
    setIsUpdatingConsent(true);
    try {
      const nextConsent = !hasVoiceConsent;
      await updateProfile({ voice_consent: nextConsent });
      setHasVoiceConsent(nextConsent);
      toast.success(nextConsent ? 'Đã kích hoạt đồng ý xử lý giọng nói' : 'Đã hủy đồng ý xử lý giọng nói');
    } catch {
      toast.error('Lỗi khi cập nhật trạng thái đồng ý giọng nói');
    } finally {
      setIsUpdatingConsent(false);
    }
  };

  const handleSaveGoals = async () => {
    setIsSavingGoals(true);
    try {
      const payload: Parameters<typeof updateLearnerGoals>[0] = {
        target_overall: Number(goals.target_overall),
        target_listening: Number(goals.target_listening),
        target_reading: Number(goals.target_reading),
        target_writing: Number(goals.target_writing),
        target_speaking: Number(goals.target_speaking),
      };
      if (goals.test_date) payload.test_date = goals.test_date;
      await updateLearnerGoals(payload);
      toast.success('Đã lưu mục tiêu IELTS thành công!');
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, 'Lỗi khi lưu mục tiêu IELTS'));
    } finally {
      setIsSavingGoals(false);
    }
  };

  const handleUpdatePassword = async (): Promise<boolean> => {
    if (!currentPassword) { toast.error('Vui lòng nhập mật khẩu hiện tại'); return false; }
    if (!newPassword || newPassword.length < 6) { toast.error('Mật khẩu mới phải có ít nhất 6 ký tự'); return false; }
    if (newPassword === currentPassword) { toast.error('Mật khẩu mới không được trùng với mật khẩu cũ'); return false; }
    if (newPassword !== confirmPassword) { toast.error('Xác nhận mật khẩu không khớp'); return false; }
    setIsUpdatingPassword(true);
    try {
      if (user?.email) {
        const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (verifyError) { toast.error('Mật khẩu hiện tại không chính xác!'); return false; }
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast.success('Đổi mật khẩu thành công!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      return true;
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, 'Có lỗi xảy ra khi đổi mật khẩu'));
      return false;
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-[#932120]" /></div>;
  }
  if (!user) {
    return <div className="text-center py-12"><p className="text-zinc-500">Vui lòng đăng nhập để xem thông tin</p></div>;
  }

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Hồ sơ cá nhân</h1>
        <p className="text-zinc-500 mt-1">Quản lý thông tin tài khoản, mục tiêu IELTS và xem tổng quan thành tích</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BlurFadeCard inView={false} index={0}>
          <ProfileStatsSidebar
            user={user}
            stats={stats}
            loadingStats={loadingStats}
            hasVoiceConsent={hasVoiceConsent}
            isUpdatingConsent={isUpdatingConsent}
            onToggleVoiceConsent={handleToggleVoiceConsent}
            streak={streak}
            badges={badges}
          />
        </BlurFadeCard>
        <div className="lg:col-span-2 space-y-6">
          <BlurFadeCard inView={false} index={1}>
            <ProfileGoalsCard
              goals={goals}
              loadingGoals={loadingGoals}
              isSavingGoals={isSavingGoals}
              onChange={setGoals}
              onSubmit={handleSaveGoals}
            />
          </BlurFadeCard>
          <BlurFadeCard index={2}>
            <ProfileAccountForm
              fullName={newName}
              email={user.email || ''}
              isUpdating={isUpdatingName}
              onNameChange={setNewName}
              onSubmit={handleUpdateName}
            />
          </BlurFadeCard>
          <BlurFadeCard index={3}>
            <ProfilePasswordForm
              currentPassword={currentPassword}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              isUpdating={isUpdatingPassword}
              onCurrentChange={setCurrentPassword}
              onNewChange={setNewPassword}
              onConfirmChange={setConfirmPassword}
              onSubmit={handleUpdatePassword}
            />
          </BlurFadeCard>
        </div>
      </div>
    </div>
  );
}
