"use client";

import React from 'react';
import { Calendar, CheckCircle2, Loader2, Target } from 'lucide-react';

const IELTS_BANDS = [
  1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0,
  5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0,
];

export interface ProfileGoalsState {
  target_overall: number;
  target_listening: number;
  target_reading: number;
  target_writing: number;
  target_speaking: number;
  test_date: string;
}

interface ProfileGoalsCardProps {
  goals: ProfileGoalsState;
  loadingGoals: boolean;
  isSavingGoals: boolean;
  onChange: (next: ProfileGoalsState) => void;
  onSubmit: () => void;
}

export function ProfileGoalsCard({
  goals,
  loadingGoals,
  isSavingGoals,
  onChange,
  onSubmit,
}: ProfileGoalsCardProps) {
  const skillFields: Array<{ key: keyof Omit<ProfileGoalsState, 'target_overall' | 'test_date'>; label: string; id: string }> = [
    { key: 'target_listening', label: 'Listening', id: 'profile-goal-listening' },
    { key: 'target_reading', label: 'Reading', id: 'profile-goal-reading' },
    { key: 'target_writing', label: 'Writing', id: 'profile-goal-writing' },
    { key: 'target_speaking', label: 'Speaking', id: 'profile-goal-speaking' },
  ];

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-zinc-200 bg-zinc-50 flex items-center gap-2">
        <Target className="w-5 h-5 text-[#932120]" />
        <h3 className="font-bold text-zinc-800 text-sm">Mục tiêu IELTS Cá nhân (Target Bands)</h3>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="p-6 space-y-5"
      >
        <p className="text-xs text-zinc-500">
          Thiết lập Band mục tiêu tổng và từng kỹ năng để Dashboard tự động so sánh tiến độ và gợi ý lộ trình học tập cá nhân hóa.
        </p>

        {loadingGoals ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-zinc-400" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="profile-goal-overall" className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Target Overall Band
                </label>
                <select
                  id="profile-goal-overall"
                  name="target_overall"
                  value={goals.target_overall}
                  onChange={(e) => onChange({ ...goals, target_overall: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm font-bold text-[#932120] bg-white focus:outline-none focus:border-[#932120]"
                >
                  {IELTS_BANDS.map((b) => (
                    <option key={b} value={b}>Band {b.toFixed(1)}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="profile-goal-test-date" className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Ngày thi dự kiến (Test Date)
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    id="profile-goal-test-date"
                    name="test_date"
                    type="date"
                    value={goals.test_date}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => onChange({ ...goals, test_date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:border-[#932120]"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              {skillFields.map((f) => (
                <div key={f.key}>
                  <label htmlFor={f.id} className="block text-xs font-medium text-zinc-600 mb-1">
                    {f.label}
                  </label>
                  <select
                    id={f.id}
                    name={f.key}
                    value={goals[f.key]}
                    onChange={(e) => onChange({ ...goals, [f.key]: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 border border-zinc-200 rounded-md text-xs font-semibold focus:outline-none focus:border-[#932120]"
                  >
                    {IELTS_BANDS.map((b) => (
                      <option key={b} value={b}>{b.toFixed(1)}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSavingGoals}
                className="bg-[#932120] text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
              >
                {isSavingGoals ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Lưu mục tiêu IELTS</span>
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
