"use client";

import React, { useState } from 'react';
import { Headphones, BookOpen, PenTool, Mic, ArrowDown, ExternalLink, Clock, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts';
import { mockScoreTracking, mockQuestionTypeResults, mockTestHistory } from '@/mocks/learning-profile';
import Link from 'next/link';

export function TestPracticeTab() {
  const [chartMode, setChartMode] = useState<'practice' | 'exam'>('practice');
  const [selectedSkillTab, setSelectedSkillTab] = useState<'Writing' | 'Listening' | 'Reading' | 'Speaking'>('Writing');

  const getScoreBadgeColor = (score: number, skill: string) => {
    if (score === 0 || isNaN(score)) return 'bg-zinc-100 text-zinc-500 border-zinc-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* 4 Skill Cards */}
      <div>
        <div className="mb-4">
          <h3 className="font-semibold text-zinc-900">Điểm trung bình hàng tuần</h3>
          <p className="text-sm text-zinc-500">So với tuần trước</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
            <div className="w-10 h-10 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mb-4">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="mt-auto">
              <p className="font-semibold text-zinc-700">Listening</p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">-.-</p>
              <p className="text-xs text-zinc-500 mt-2">Không có dữ liệu</p>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="mt-auto">
              <p className="font-semibold text-zinc-700">Reading</p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">-.-</p>
              <p className="text-xs text-zinc-500 mt-2">Không có dữ liệu</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 ml-1">
              <PenTool className="w-5 h-5" />
            </div>
            <div className="mt-auto ml-1">
              <p className="font-semibold text-zinc-700">Writing</p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">1.0</p>
              <p className="text-xs text-zinc-500 mt-2">1 bài test đã hoàn thành</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col">
            <div className="w-10 h-10 bg-yellow-100 text-yellow-500 rounded-full flex items-center justify-center mb-4">
              <Mic className="w-5 h-5" />
            </div>
            <div className="mt-auto">
              <p className="font-semibold text-zinc-700">Speaking</p>
              <p className="text-2xl font-bold text-zinc-900 mt-1">-.-</p>
              <p className="text-xs text-zinc-500 mt-2">Không có dữ liệu</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mt-3 italic">Điểm số được tính trên thang điểm IELTS</p>
      </div>

      {/* Line Chart Section */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
          <div>
            <h3 className="font-semibold text-zinc-900">Theo dõi điểm số</h3>
            <p className="text-sm text-zinc-500">Dựa trên 30 bài test gần nhất</p>
          </div>
          <div className="bg-zinc-100 p-1 rounded-lg flex mt-4 sm:mt-0">
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartMode === 'practice' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
              onClick={() => setChartMode('practice')}
            >
              Chế độ luyện tập
            </button>
            <button 
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${chartMode === 'exam' ? 'bg-white shadow-sm text-zinc-900' : 'text-zinc-500 hover:text-zinc-700'}`}
              onClick={() => setChartMode('exam')}
            >
              Chế độ phòng thi
            </button>
          </div>
        </div>
        
        {/* Legend / Checkboxes */}
        <div className="flex gap-4 mb-4">
          {['Listening', 'Reading', 'Writing', 'Speaking'].map((skill) => (
            <label key={skill} className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" defaultChecked={skill === 'Writing'} className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4" />
              <span className="text-sm font-medium text-zinc-700">{skill}</span>
            </label>
          ))}
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={mockScoreTracking.filter(d => d.mode === chartMode)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis dataKey="testNumber" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} tickFormatter={(val) => `#${val}`} />
              <YAxis domain={[0, 9]} ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 12 }} />
              <RechartsTooltip cursor={{ stroke: '#f4f4f5', strokeWidth: 2 }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
              <Line type="monotone" dataKey="writing" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Results by Question Type */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-zinc-200">
          <h3 className="font-semibold text-zinc-900">Kết quả học tập theo dạng bài</h3>
          <p className="text-sm text-zinc-500 mb-4">Theo dõi kết quả luyện tập và xem phân tích chi tiết theo dạng bài.</p>
          
          <div className="flex gap-2 mb-4 border-b border-zinc-200 pb-1">
            {['Listening', 'Reading', 'Writing', 'Speaking'].map(skill => (
              <button 
                key={skill}
                onClick={() => setSelectedSkillTab(skill as any)}
                className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-[1px] ${selectedSkillTab === skill ? 'border-[#932120] text-[#932120]' : 'border-transparent text-zinc-500 hover:text-zinc-800 hover:border-zinc-300'}`}
              >
                {skill}
              </button>
            ))}
          </div>
          
          <div className="bg-orange-50 border border-orange-100 p-4 rounded-lg flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-orange-900">Ưu tiên luyện tập: {selectedSkillTab} Tasks để cải thiện band điểm.</p>
            </div>
            <Link href="/test-practice" className="text-sm font-medium text-[#932120] hover:underline">
              Đến Test Practice
            </Link>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500">
              <tr>
                <th className="px-6 py-3 font-medium">Loại câu hỏi</th>
                <th className="px-6 py-3 font-medium cursor-pointer flex items-center gap-1 hover:text-zinc-700">Điểm trung bình <ArrowDown className="w-3 h-3" /></th>
                <th className="px-6 py-3 font-medium">Thời gian luyện tập gần nhất</th>
                <th className="px-6 py-3 font-medium text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {mockQuestionTypeResults.filter(q => q.skill === selectedSkillTab).length > 0 ? (
                mockQuestionTypeResults.filter(q => q.skill === selectedSkillTab).map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900">{row.type}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md border text-xs font-bold ${getScoreBadgeColor(row.averageScore, row.skill)}`}>
                        {row.averageScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{new Date(row.lastPracticeTime).toLocaleDateString('vi-VN')}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href="/test-practice" className="text-[#932120] hover:text-red-800 font-medium text-sm flex items-center justify-end gap-1">
                        Luyện tập thêm <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">
                    Chưa có dữ liệu cho kỹ năng này. Hãy bắt đầu làm bài!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Practice Timeline */}
      <div className="bg-white p-6 rounded-xl border border-zinc-200 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-semibold text-zinc-900">Lịch sử Test Practice</h3>
            <p className="text-sm text-zinc-500">Dựa trên 30 ngày qua</p>
          </div>
          <Link href="/history" className="text-sm font-medium text-[#932120] hover:underline">
            Xem tất cả →
          </Link>
        </div>

        <div className="relative pl-4 border-l-2 border-blue-100 space-y-6">
          <div className="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-0 ring-4 ring-white"></div>
          <p className="text-sm font-bold text-blue-600 mb-4 -mt-1">{new Date().toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</p>
          
          {mockTestHistory.map((item) => (
            <div key={item.id} className="relative bg-zinc-50 border border-zinc-100 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100`}>
                    {item.score === 0 ? '0%' : item.score.toFixed(1)}
                  </span>
                  <span className="text-xs font-medium text-zinc-500 bg-zinc-200 px-2 py-0.5 rounded">Luyện theo dạng bài</span>
                </div>
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Submitted on: {new Date(item.submittedAt).toLocaleDateString('vi-VN')}
                </span>
              </div>
              <h4 className="font-semibold text-zinc-900 text-sm mb-1 line-clamp-1" title={item.testName}>{item.testName}</h4>
              <p className="text-xs text-zinc-500">{item.type}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
