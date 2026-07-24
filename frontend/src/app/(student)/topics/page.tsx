import React from 'react';
import { StudentPageLayout } from '@/components/layout/StudentPageLayout';
import { Search, Filter, PenTool } from 'lucide-react';
import Link from 'next/link';

export default function TopicsPage() {
  const topics = [
    { id: 1, category: 'Education', title: 'Some people believe that the widespread use of the internet has a mostly negative effect on social interaction.', type: 'Opinion' },
    { id: 2, category: 'Environment', title: 'Global warming is one of the most serious issues that the world is facing today. What are the causes of global warming and what measures can governments and individuals take to tackle the issue?', type: 'Causes & Solutions' },
    { id: 3, category: 'Technology', title: 'In the future, nobody will buy printed newspapers or books because they will be able to read everything they want online without paying. To what extent do you agree or disagree?', type: 'Opinion' },
    { id: 4, category: 'Health', title: 'Despite advances in medicine, many people around the world still suffer from preventable diseases. Why is this the case, and what can be done to solve this problem?', type: 'Causes & Solutions' },
    { id: 5, category: 'Society', title: 'Some people think that a sense of competition in children should be encouraged. Others believe that children who are taught to co-operate rather than compete become more useful adults. Discuss both these views and give your own opinion.', type: 'Discussion' },
    { id: 6, category: 'Work', title: 'More and more people are choosing to work from home. Do the advantages of this development outweigh the disadvantages?', type: 'Advantages & Disadvantages' }
  ];

  return (
    <StudentPageLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div className="flex justify-between w-full sm:w-auto items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">Ngân hàng đề thi</h1>
              <p className="text-zinc-500 mt-1">Chọn một chủ đề để bắt đầu luyện viết (IELTS Task 2)</p>
            </div>
            <Link href="/exam" className="sm:hidden">
              <button className="bg-[#932120] text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors text-sm">
                Tự viết
              </button>
            </Link>
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Link href="/exam" className="hidden sm:block">
              <button className="bg-[#932120] text-white px-5 py-2 border border-transparent rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors h-full flex items-center">
                Chấm bài tự do
              </button>
            </Link>
            <div className="relative flex-1 sm:flex-none">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                className="pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] w-full sm:w-64"
              />
            </div>
            <button className="p-2 border border-zinc-200 rounded-lg hover:bg-zinc-50 text-zinc-600">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {topics.map(topic => (
            <div key={topic.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] uppercase font-bold tracking-wider bg-zinc-100 text-zinc-600 px-2 py-1 rounded">
                    {topic.category}
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider border border-zinc-200 text-zinc-500 px-2 py-1 rounded">
                    {topic.type}
                  </span>
                </div>
                <h3 className="font-semibold text-zinc-800 text-sm leading-relaxed mb-4">
                  {topic.title}
                </h3>
              </div>
              <div className="flex justify-between items-center mt-2 pt-4 border-t border-zinc-100">
                <span className="text-xs text-zinc-400 font-medium">1,204 người đã làm</span>
                <Link href="/exam">
                  <button className="flex items-center gap-2 text-sm font-bold text-[#932120] hover:bg-[#932120]/10 px-4 py-2 rounded-lg transition-colors">
                    <PenTool className="w-4 h-4" />
                    Viết bài
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </StudentPageLayout>
  );
}
