"use client";

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Home, 
  ChevronRight, 
  RotateCcw, 
  Play, 
  CheckCircle2, 
  BookOpen, 
  Search, 
  Filter, 
  Headphones, 
  PenTool, 
  Mic, 
  Clock, 
  ArrowLeft,
  FileEdit
} from 'lucide-react';
import { mockExamCollections } from '@/mocks/test-sets';
import { SingleTestItem } from '@/types/test-practice';

export default function ExamCollectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params?.setId as string;

  const collection = mockExamCollections.find((c) => c.id === setId) || mockExamCollections[0];
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'not_started'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Lọc danh sách bài test theo trạng thái và tìm kiếm
  const filteredTests = collection.tests.filter((test) => {
    const isCompleted = test.skills.some((s) => s.status === 'completed');
    if (filterStatus === 'completed' && !isCompleted) return false;
    if (filterStatus === 'not_started' && isCompleted) return false;
    if (searchQuery && !test.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="w-full max-w-[1536px] mx-auto space-y-6 px-2 sm:px-4 py-2">
      {/* Breadcrumb theo chuẩn ảnh 3 PrepEdu */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500">
        <Link href="/test-practice" className="hover:text-[#932120] flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Test Practice</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-300" />
        <span className="text-zinc-800 font-bold">{collection.title}</span>
      </nav>

      {/* Header Bộ Đề (Ảnh bìa + Tên + Tiến độ hoàn thành) */}
      <div className="bg-white rounded-3xl border border-zinc-200 p-6 sm:p-8 shadow-xs flex flex-col md:flex-row items-start md:items-center gap-6">
        <div className="w-32 h-44 sm:w-36 sm:h-48 rounded-2xl overflow-hidden shrink-0 shadow-md border border-zinc-200 relative">
          <img 
            src={collection.imageUrl} 
            alt={collection.title} 
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-[#932120] text-xs font-bold border border-red-100">
            <span>Bộ đề thi IELTS Academic</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            {collection.title}
          </h1>

          <div className="flex items-center gap-2 text-sm text-zinc-600 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Đã làm {collection.completedTestsCount}/{collection.testsCount} đề</span>
          </div>

          <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl font-normal leading-relaxed">
            Hệ thống bài thi chuẩn hóa quốc tế với đầy đủ 4 kỹ năng Listening, Reading, Writing và Speaking. Hỗ trợ chấm điểm AI chuyên sâu theo 4 tiêu chí của Đại học Cambridge.
          </p>
        </div>
      </div>

      {/* Danh Sách Đề Thi */}
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200">
          <h2 className="text-lg font-black text-zinc-900 tracking-tight">
            Danh sách đề
          </h2>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-zinc-100 p-1 rounded-xl text-xs font-bold">
              <button
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'all' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Tất cả đề
              </button>
              <button
                onClick={() => setFilterStatus('completed')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'completed' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Đã làm
              </button>
              <button
                onClick={() => setFilterStatus('not_started')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'not_started' ? 'bg-white text-zinc-900 shadow-2xs' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Chưa làm
              </button>
            </div>

            <div className="relative flex-1 sm:w-56">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm đề..."
                className="w-full pl-8 pr-3 py-1 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
              />
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-2" />
            </div>
          </div>
        </div>

        {/* List các bài test (Đánh số 1, 2, 3...) theo chuẩn ảnh 3 */}
        <div className="space-y-3.5">
          {filteredTests.map((test) => {
            const isCompleted = test.skills.some((s) => s.status === 'completed');
            const hasDraft = test.skills.some((s) => s.status === 'draft');

            return (
              <div 
                key={test.id}
                className="flex items-center gap-4 group"
              >
                {/* Số thứ tự tròn bên trái */}
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                  isCompleted 
                    ? 'bg-blue-600 text-white shadow-xs' 
                    : 'bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200'
                }`}>
                  {test.orderNumber}
                </div>

                {/* Card nội dung bài test */}
                <div className={`flex-1 bg-white rounded-2xl border p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                  isCompleted 
                    ? 'border-blue-200 shadow-xs ring-1 ring-blue-100/50' 
                    : 'border-zinc-200 hover:border-zinc-300 shadow-2xs'
                }`}>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {isCompleted ? (
                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                          <BookOpen className="w-3.5 h-3.5" />
                        </div>
                      )}
                      <h3 className="font-bold text-zinc-900 text-base">
                        {test.title}
                      </h3>
                      {hasDraft && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          Đang lưu nháp
                        </span>
                      )}
                    </div>

                    {/* Skill tags kèm điểm số (chuẩn ảnh 3 PrepEdu) */}
                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {test.skills.map((s) => {
                        const score = s.latestBandScore;
                        return (
                          <span
                            key={s.skill}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold ${
                              s.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : s.status === 'draft'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : 'bg-zinc-100 text-zinc-600'
                            }`}
                          >
                            {score !== undefined && (
                              <strong className="font-black text-emerald-800">{score.toFixed(1)}</strong>
                            )}
                            {s.skill === 'Listening' && <Headphones className="w-3 h-3" />}
                            {s.skill === 'Reading' && <BookOpen className="w-3 h-3" />}
                            {s.skill === 'Writing' && <PenTool className="w-3 h-3" />}
                            {s.skill === 'Speaking' && <Mic className="w-3 h-3" />}
                            <span>{s.skill}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Nút hành động rẽ nhánh: Làm lại hoặc Làm bài */}
                  <div className="shrink-0 self-end sm:self-center">
                    <Link
                      href={`/test-practice/set/${collection.id}/test/${test.id}`}
                      className={`h-9 px-5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 active:scale-95 ${
                        isCompleted
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isCompleted ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Làm lại</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Làm bài</span>
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
