"use client";

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import type { TestScoreTracking } from '@/types/learning-profile';

interface TestPracticeScoreLineChartProps {
  scoreTracking: TestScoreTracking[];
}

export function TestPracticeScoreLineChart({ scoreTracking }: TestPracticeScoreLineChartProps) {
  const [chartMode, setChartMode] = useState<'all' | 'practice' | 'exam'>('all');
  const [selectedSkill, setSelectedSkill] = useState<string>('All');

  const filteredData = scoreTracking
    .filter((d) => {
      if (chartMode === 'practice' && d.mode !== 'practice') return false;
      if (chartMode === 'exam' && d.mode !== 'exam' && d.mode !== 'mock') return false;
      if (selectedSkill !== 'All' && d.skill !== selectedSkill) return false;
      return true;
    })
    .map((d, idx) => ({ ...d, displayIndex: idx + 1 }));

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h3 className="font-bold text-zinc-900 text-sm">Theo dõi tiến trình điểm số</h3>
          <p className="text-xs text-zinc-500">Dựa trên kết quả chấm điểm các bài test gần nhất</p>
        </div>
        <div className="bg-zinc-100 p-1 rounded-xl flex text-xs font-semibold">
          <button
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              chartMode === 'all' ? 'bg-white shadow-2xs text-[#932120]' : 'text-zinc-600 hover:text-zinc-900'
            }`}
            onClick={() => setChartMode('all')}
          >
            Tất cả
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              chartMode === 'practice' ? 'bg-white shadow-2xs text-[#932120]' : 'text-zinc-600 hover:text-zinc-900'
            }`}
            onClick={() => setChartMode('practice')}
          >
            Luyện tập
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              chartMode === 'exam' ? 'bg-white shadow-2xs text-[#932120]' : 'text-zinc-600 hover:text-zinc-900'
            }`}
            onClick={() => setChartMode('exam')}
          >
            Phòng thi
          </button>
        </div>
      </div>

      {/* Bộ lọc kỹ năng nhanh */}
      <div className="flex items-center gap-2 flex-wrap text-xs">
        <span className="text-zinc-500 font-semibold mr-1">Lọc kỹ năng:</span>
        {['All', 'Reading', 'Listening', 'Writing', 'Speaking'].map((sk) => (
          <button
            key={sk}
            onClick={() => setSelectedSkill(sk)}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              selectedSkill === sk
                ? 'bg-[#932120] text-white shadow-2xs'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
            }`}
          >
            {sk === 'All' ? 'Tất cả 4 kỹ năng' : sk}
          </button>
        ))}
      </div>

      <div className="h-64 sm:h-72 w-full pt-2">
        {filteredData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
              <XAxis
                dataKey="displayIndex"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
                tickFormatter={(val) => `#${val}`}
              />
              <YAxis
                domain={[0, 9]}
                ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11 }}
              />
              <RechartsTooltip
                cursor={{ stroke: '#f4f4f5', strokeWidth: 2 }}
                contentStyle={{
                  borderRadius: '12px',
                  border: '1px solid #e4e4e7',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                  fontSize: '12px',
                }}
                labelFormatter={(_label, payload) => {
                  const row = payload?.[0]?.payload;
                  if (!row) return '';
                  return `#${row.displayIndex} · ${row.skill || ''}${row.date ? ` (${row.date})` : ''}`;
                }}
                formatter={(value, _name, item) => {
                  const payload = item?.payload as TestScoreTracking | undefined;
                  const title = payload?.title || 'Bài test';
                  return [`Band ${Number(value ?? 0).toFixed(1)}`, title];
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="#932120"
                strokeWidth={2.5}
                dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-zinc-400 bg-zinc-50 rounded-xl border border-dashed border-zinc-200">
            Chưa có bài thi hoàn thành nào trong bộ lọc này.
          </div>
        )}
      </div>
    </div>
  );
}
