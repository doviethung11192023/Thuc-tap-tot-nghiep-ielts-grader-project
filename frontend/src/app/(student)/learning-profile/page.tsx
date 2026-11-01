"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLearningProfile } from '@/hooks/useLearningProfile';
import { OverviewTab } from '@/components/learning-profile/OverviewTab';
import { TestPracticeTab } from '@/components/learning-profile/TestPracticeTab';
import { GoalSetterModal } from '@/components/learning-profile/GoalSetterModal';
import { Target, TrendingUp, RefreshCw } from 'lucide-react';

export default function LearningProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'test-practice'>('overview');
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);

  const { overview, practice, loading, savingGoal, saveGoals, refresh } = useLearningProfile();

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-200 pb-4 gap-3">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Hồ Sơ Năng Lực Học Tập (Learning Profile)</h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">Theo dõi tiến độ, tần suất học và sự cải thiện điểm số thực tế sau mỗi bài thi.</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          title="Tải lại số liệu mới nhất"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#932120]' : 'text-zinc-500'}`} />
          <span>Làm mới</span>
        </button>
      </div>
      
      <div className="flex space-x-1.5 bg-zinc-100 p-1 rounded-xl w-fit border border-zinc-200">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'overview' ? 'bg-white text-[#932120] shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <Target className="w-4 h-4" />
          Tổng quan năng lực
        </button>
        <button 
          onClick={() => setActiveTab('test-practice')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'test-practice' ? 'bg-white text-[#932120] shadow-xs' : 'text-zinc-600 hover:text-zinc-900'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Tiến trình Test Practice
        </button>
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          userName={user?.full_name || 'Học viên'}
          data={overview}
          loading={loading}
          onOpenGoalModal={() => setIsGoalModalOpen(true)}
        />
      )}

      {activeTab === 'test-practice' && (
        <TestPracticeTab
          data={practice}
          loading={loading}
        />
      )}

      {isGoalModalOpen && overview && (
        <GoalSetterModal
          isOpen={isGoalModalOpen}
          onClose={() => setIsGoalModalOpen(false)}
          currentGoals={overview.goals}
          onSave={saveGoals}
          saving={savingGoal}
        />
      )}
    </div>
  );
}
