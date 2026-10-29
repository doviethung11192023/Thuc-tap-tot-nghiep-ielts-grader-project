"use client";

import React, { useEffect, useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowRight, 
  Loader2, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic, 
  Sparkles,
  Calendar,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { getEssayHistory } from '@/services/essays';
import { getStudentHistory } from '@/services/student-test-practice';
import { EssayHistoryItem } from '@/types';
import toast from 'react-hot-toast';

export interface UnifiedHistoryItem {
  id: string;
  test_title: string;
  skill: 'Listening' | 'Reading' | 'Writing' | 'Speaking';
  submitted_at: string;
  status: 'completed' | 'pending' | 'evaluating' | 'failed';
  overall_band?: number;
  correct_count?: number;
  total_questions?: number;
  summary_url: string;
}

export default function HistoryPage() {
  const [historyItems, setHistoryItems] = useState<UnifiedHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering states
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    async function loadAllHistory() {
      try {
        setLoading(true);

        // 1. Dữ liệu bài thi thật từ de_bai_clean và dap_an_loi_giai_clean (Recent Actual Test Test 1)
        const cleanDatasetItems: UnifiedHistoryItem[] = [
          {
            id: 'clean-rat-listening-test-1',
            test_title: 'Recent Actual Test - Listening Test 1',
            skill: 'Listening',
            submitted_at: '2026-10-12T21:31:00Z',
            status: 'completed',
            overall_band: 4.5,
            correct_count: 13,
            total_questions: 40,
            summary_url: '/test-practice/listening/test-1/summary',
          },
          {
            id: 'clean-rat-reading-test-1',
            test_title: 'Recent Actual Test - Reading Test 1',
            skill: 'Reading',
            submitted_at: '2026-10-12T15:43:00Z',
            status: 'completed',
            overall_band: 4.0,
            correct_count: 10,
            total_questions: 40,
            summary_url: '/test-practice/reading/test-1/summary',
          },
          {
            id: 'writing-academic-wt2',
            test_title: 'WT2: Higher Education Funding',
            skill: 'Writing',
            submitted_at: '2026-10-16T19:40:00Z',
            status: 'completed',
            overall_band: 6.5,
            summary_url: '/test-practice/writing/writing-1/summary',
          },
          {
            id: 'speaking-full-test-1',
            test_title: 'Full Test 1: Saying thank you, Wild animals and Politeness',
            skill: 'Speaking',
            submitted_at: '2026-10-18T09:20:00Z',
            status: 'completed',
            overall_band: 8.0,
            summary_url: '/test-practice/speaking/speaking-1/summary',
          },
        ];

        // 2. Fetch thêm các bài thi từ test_attempts backend
        try {
          const studentHistoryData = await getStudentHistory(1, 20);
          if (studentHistoryData?.items && studentHistoryData.items.length > 0) {
            const mappedAttempts: UnifiedHistoryItem[] = studentHistoryData.items.map((item: any) => ({
              id: item.id,
              test_title: item.title,
              skill: item.skill,
              submitted_at: item.submitted_at,
              status: item.status === 'scored' ? 'completed' : 'pending',
              overall_band: item.band,
              summary_url: `/test-practice/${item.skill.toLowerCase()}/${item.test_id}/summary?attemptId=${item.id}`
            }));
            cleanDatasetItems.unshift(...mappedAttempts);
          }
        } catch (e) {
          console.log('Using local clean dataset history fallback');
        }

        // 3. Fetch thêm các bài viết từ API backend (nếu có)
        try {
          const apiData = await getEssayHistory({ page: 1, limit: 20 });
          if (apiData && apiData.items && apiData.items.length > 0) {
            const mappedApiItems: UnifiedHistoryItem[] = apiData.items.map((item) => ({
              id: item.essay_id,
              test_title: item.topic_title || 'Bài viết Writing Task',
              skill: 'Writing',
              submitted_at: item.submitted_at,
              status: item.status as any,
              overall_band: item.overall_band || undefined,
              summary_url: `/test-practice/writing/${item.essay_id}/summary`,
            }));
            cleanDatasetItems.push(...mappedApiItems);
          }
        } catch (e) {
          // Backend có thể offline khi chạy local frontend, dùng clean dataset làm chuẩn
          console.log('Using local clean dataset history');
        }

        setHistoryItems(cleanDatasetItems);
      } catch (err) {
        console.error('Failed to load history:', err);
        toast.error('Không thể lấy danh sách lịch sử.');
      } finally {
        setLoading(false);
      }
    }

    loadAllHistory();
  }, []);

  // Filter logic
  const filteredHistory = historyItems.filter((item) => {
    const matchesSkill = selectedSkillFilter === 'All' || item.skill === selectedSkillFilter;
    const matchesStatus = !statusFilter || item.status === statusFilter;
    const matchesSearch = !searchQuery || item.test_title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSkill && matchesStatus && matchesSearch;
  });

  const getSkillBadge = (skill: string) => {
    switch (skill) {
      case 'Listening':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Headphones className="w-3 h-3" />
            <span>Listening</span>
          </span>
        );
      case 'Reading':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <BookOpen className="w-3 h-3" />
            <span>Reading</span>
          </span>
        );
      case 'Writing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <PenTool className="w-3 h-3" />
            <span>Writing</span>
          </span>
        );
      case 'Speaking':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Mic className="w-3 h-3" />
            <span>Speaking</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Bộ lọc */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Lịch sử làm bài</h1>
          <p className="text-zinc-500 text-xs sm:text-sm mt-1">
            Tổng hợp kết quả làm bài của bạn trên cả 4 kỹ năng (Listening, Reading, Writing, Speaking)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 sm:w-60">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên bài..." 
              className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#932120] bg-white"
            />
          </div>

          {/* Lọc trạng thái */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="py-2 px-3 border border-zinc-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:border-[#932120] bg-white text-zinc-700 font-medium"
          >
            <option value="">Tất cả trạng thái</option>
            <option value="completed">Đã chấm điểm</option>
            <option value="evaluating">Đang chấm điểm</option>
            <option value="pending">Chờ chấm điểm</option>
            <option value="failed">Lỗi xử lý</option>
          </select>
        </div>
      </div>

      {/* Tabs Lọc Theo Kỹ Năng */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
        {(['All', 'Listening', 'Reading', 'Writing', 'Speaking'] as const).map((s) => {
          const isSelected = selectedSkillFilter === s;
          const count = s === 'All' ? historyItems.length : historyItems.filter(h => h.skill === s).length;

          return (
            <button
              key={s}
              onClick={() => setSelectedSkillFilter(s)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                isSelected 
                  ? 'bg-[#932120] text-white shadow-xs' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              <span>{s === 'All' ? 'Tất cả kỹ năng' : s}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                isSelected ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-600'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bảng Danh Sách Lịch Sử */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-[11px] uppercase tracking-wider text-zinc-500 font-bold">
                <th className="px-5 py-3.5 text-center w-14">STT</th>
                <th className="px-5 py-3.5 w-32">Kỹ năng</th>
                <th className="px-5 py-3.5">Bài thi / Đề bài</th>
                <th className="px-5 py-3.5">Ngày nộp</th>
                <th className="px-5 py-3.5 text-center">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Band Score</th>
                <th className="px-5 py-3.5 text-center w-24">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 text-xs sm:text-sm">
              {loading && (
                <tr>
                  <td colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-400 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
                      <span className="text-xs font-medium">Đang tải lịch sử làm bài...</span>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filteredHistory.length === 0 && (
                <tr>
                  <td colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center text-zinc-400 gap-3">
                      <BookOpen className="w-12 h-12 text-zinc-200" />
                      <span className="text-sm font-medium text-zinc-500">Chưa có bài thi nào phù hợp.</span>
                      <Link href="/test-practice" className="mt-1 text-xs text-[#932120] font-bold hover:underline">
                        Khám phá kho đề thi ngay
                      </Link>
                    </div>
                  </td>
                </tr>
              )}

              {!loading && filteredHistory.map((item, index) => (
                <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors group">
                  <td className="px-5 py-4 text-center font-mono text-xs font-bold text-zinc-400">
                    #{index + 1}
                  </td>
                  <td className="px-5 py-4">
                    {getSkillBadge(item.skill)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="font-bold text-zinc-900 group-hover:text-[#932120] transition-colors line-clamp-1">
                      {item.test_title}
                    </div>
                    {item.correct_count !== undefined && item.total_questions !== undefined && (
                      <span className="text-[11px] text-zinc-400 font-medium">
                        Đúng {item.correct_count}/{item.total_questions} câu
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-600 font-medium">
                    {new Date(item.submitted_at).toLocaleDateString('vi-VN')}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      item.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                      item.status === 'failed' ? 'bg-red-100 text-red-700' :
                      item.status === 'evaluating' ? 'bg-blue-100 text-blue-700' :
                      'bg-zinc-100 text-zinc-700'
                    }`}>
                      {item.status === 'completed' ? 'Đã chấm điểm' : item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {item.overall_band !== null && item.overall_band !== undefined ? (
                      <span className="font-black text-[#932120] text-base sm:text-lg">
                        {item.overall_band.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-zinc-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    {/* BẤM VÀO ĐIỀU HƯỚNG TRỰC TIẾP SANG MÀN HÌNH KẾT QUẢ TÓM TẮT (/summary) */}
                    <Link 
                      href={item.summary_url}
                      title="Xem kết quả tóm tắt và chi tiết"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-red-50 hover:border-red-200 text-zinc-700 hover:text-[#932120] text-xs font-bold transition-all shadow-2xs active:scale-95"
                    >
                      <span>Xem</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
