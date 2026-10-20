"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { OverviewTab } from '@/components/learning-profile/OverviewTab';
import { TestPracticeTab } from '@/components/learning-profile/TestPracticeTab';
import { Target, TrendingUp } from 'lucide-react';

export default function LearningProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'test-practice'>('overview');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-zinc-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Learning Profile</h1>
          <p className="text-sm text-zinc-500 mt-1">Theo dõi tiến độ và sự cải thiện sau mỗi buổi học.</p>
        </div>
      </div>
      
      <div className="flex space-x-1 bg-zinc-100 p-1 rounded-lg w-fit">
        <button 
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'bg-white text-[#932120] shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
        >
          <Target className="w-4 h-4" />
          Tổng quan
        </button>
        <button 
          onClick={() => setActiveTab('test-practice')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'test-practice' ? 'bg-white text-[#932120] shadow-sm' : 'text-zinc-600 hover:text-zinc-900'}`}
        >
          <TrendingUp className="w-4 h-4" />
          Test Practice
        </button>
      </div>

      {activeTab === 'overview' && <OverviewTab userName={user?.full_name || 'Student'} />}
      {activeTab === 'test-practice' && <TestPracticeTab />}
    </div>
  );
}
