"use client";

import React, { useState } from 'react';
import { Search, PenTool, Loader2, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { getTopics } from '@/services/topics';

export default function TopicsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [taskType, setTaskType] = useState<string>(''); // 'task1' | 'task2' | ''
  const [category, setCategory] = useState<string>('');
  const [difficulty, setDifficulty] = useState<string>(''); // 'easy' | 'medium' | 'hard' | ''

  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  
  // API call
  const { data, isLoading, isError } = useQuery({
    queryKey: ['topics', taskType, category, difficulty],
    queryFn: () => getTopics({ 
      limit: 100, 
      task_type: (taskType as any) || undefined,
      category: category || undefined,
      difficulty: (difficulty as any) || undefined
    }),
  });

  const topics = data?.items || [];
  
  // Client-side search filtering (since API doesn't seem to have a search param yet)
  const filteredTopics = topics.filter(t => 
    t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (t.prompt_content && t.prompt_content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const categories = ["Education", "Environment", "Technology", "Health", "Society", "Work", "Crime", "Government", "Media"];

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="flex justify-between w-full sm:w-auto items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Ngân hàng đề thi</h1>
            <p className="text-zinc-500 mt-1">Chọn một chủ đề để bắt đầu luyện viết (IELTS Task 1 & 2)</p>
          </div>
          <Link href="/exam" className="sm:hidden">
            <button className="bg-[#932120] text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors text-sm">
              Tự viết
            </button>
          </Link>
        </div>
        
        <Link href="/exam" className="hidden sm:block">
          <button className="bg-[#932120] text-white px-5 py-2 border border-transparent rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors h-full flex items-center">
            Chấm bài tự do
          </button>
        </Link>
      </div>

      {/* Filter Area (Linear/Notion Style) */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm đề bài..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-full"
            />
          </div>

          {/* Task Type Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'taskType' ? null : 'taskType')}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Dạng bài <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {activeDropdown === 'taskType' && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg z-10 py-1">
                <button onClick={() => { setTaskType('task1'); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50">Task 1</button>
                <button onClick={() => { setTaskType('task2'); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50">Task 2</button>
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'category' ? null : 'category')}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Chủ đề <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {activeDropdown === 'category' && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-zinc-200 rounded-lg shadow-lg z-10 py-1 max-h-60 overflow-y-auto">
                {categories.map(cat => (
                  <button key={cat} onClick={() => { setCategory(cat); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50">{cat}</button>
                ))}
              </div>
            )}
          </div>

          {/* Difficulty Dropdown */}
          <div className="relative">
            <button 
              onClick={() => setActiveDropdown(activeDropdown === 'difficulty' ? null : 'difficulty')}
              className="flex items-center gap-2 px-3 py-2 bg-white border border-zinc-200 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Độ khó <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>
            {activeDropdown === 'difficulty' && (
              <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-zinc-200 rounded-lg shadow-lg z-10 py-1">
                <button onClick={() => { setDifficulty('easy'); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50">Dễ (Easy)</button>
                <button onClick={() => { setDifficulty('medium'); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50">Trung bình</button>
                <button onClick={() => { setDifficulty('hard'); setActiveDropdown(null); }} className="w-full text-left px-4 py-2 text-sm hover:bg-zinc-50">Khó (Hard)</button>
              </div>
            )}
          </div>
        </div>

        {/* Active Filter Pills */}
        {(taskType || category || difficulty) && (
          <div className="flex flex-wrap gap-2 mt-1">
            {taskType && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-[#932120]/10 text-[#932120] rounded-full text-xs font-semibold">
                {taskType === 'task1' ? 'Task 1' : 'Task 2'}
                <button onClick={() => setTaskType('')} className="hover:text-red-700"><X className="w-3 h-3" /></button>
              </span>
            )}
            {category && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full text-xs font-semibold">
                {category}
                <button onClick={() => setCategory('')} className="hover:text-zinc-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            {difficulty && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold">
                {difficulty === 'easy' ? 'Dễ' : difficulty === 'medium' ? 'Trung bình' : 'Khó'}
                <button onClick={() => setDifficulty('')} className="hover:text-orange-900"><X className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={() => { setTaskType(''); setCategory(''); setDifficulty(''); }} className="text-xs text-zinc-400 hover:text-zinc-600 font-medium ml-2">Xóa tất cả</button>
          </div>
        )}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 text-red-500 p-4 rounded-lg text-center">
          Lỗi khi tải danh sách đề thi. Vui lòng thử lại.
        </div>
      ) : filteredTopics.length === 0 ? (
        <div className="bg-zinc-50 text-zinc-500 p-10 rounded-xl text-center border border-zinc-200">
          Không tìm thấy đề thi nào phù hợp với bộ lọc.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTopics.map(topic => (
            <div key={topic.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-zinc-100 text-zinc-600 px-2 py-1 rounded">
                    {topic.category || 'General'}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider border border-zinc-200 text-zinc-500 px-2 py-1 rounded">
                    {topic.task_type === 'task1' ? 'Task 1' : 'Task 2'}
                  </span>
                  {topic.difficulty && (
                    <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded ${
                      topic.difficulty === 'easy' ? 'bg-green-100 text-green-700' :
                      topic.difficulty === 'medium' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {topic.difficulty}
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-zinc-800 text-sm leading-relaxed mb-4">
                  {topic.title}
                </h3>
              </div>
              <div className="flex justify-between items-center mt-2 pt-4 border-t border-zinc-100">
                <span className="text-xs text-zinc-400 font-medium">{topic.created_at ? new Date(topic.created_at).toLocaleDateString('vi-VN') : 'New'}</span>
                <Link href={`/exam?topicId=${topic.id}`}>
                  <button className="flex items-center gap-2 text-sm font-bold text-[#932120] hover:bg-[#932120]/10 px-4 py-2 rounded-lg transition-colors">
                    <PenTool className="w-4 h-4" />
                    Viết bài
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
