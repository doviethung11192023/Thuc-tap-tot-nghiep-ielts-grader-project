"use client";

import React, { useState } from 'react';
import { 
  Search, 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic, 
  Library, 
  Target, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  Award,
  Filter,
  Bookmark,
  Flame,
  Crown,
  ChevronRight
} from 'lucide-react';
import { mockTestSets, mockQuestionTypes, mockExercises } from '@/mocks/test-practice';
import { mockExamCollections } from '@/mocks/test-sets';
import Link from 'next/link';
import { TestPrepModal } from '@/components/exam/TestPrepModal';

export default function TestPracticePage() {
  const [activeTab, setActiveTab] = useState<'explore' | 'by-type'>('explore');
  const [skillFilter, setSkillFilter] = useState<string>('All');
  const [selectedSkill, setSelectedSkill] = useState<'Reading' | 'Listening' | 'Writing' | 'Speaking'>('Reading');
  const [selectedQuestionType, setSelectedQuestionType] = useState<string | null>(null);
  const [activeTestPrep, setActiveTestPrep] = useState<{ id: string; title: string; skill: 'Reading' | 'Listening' | 'Writing' | 'Speaking' } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Lọc bộ đề theo kỹ năng và tìm kiếm (đã loại bỏ hoàn toàn các tag HOT/Pro)
  const filteredTestSets = mockTestSets.filter(testSet => {
    const matchesSkill = skillFilter === 'All' || testSet.tags.includes(skillFilter);
    const matchesSearch = testSet.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSkill && matchesSearch;
  });

  const getSkillFromTags = (tags: string[]): 'Reading' | 'Listening' | 'Writing' | 'Speaking' => {
    if (tags.includes('Listening')) return 'Listening';
    if (tags.includes('Writing')) return 'Writing';
    if (tags.includes('Speaking')) return 'Speaking';
    return 'Reading';
  };

  // Đếm số lượng đề cho từng filter pill
  const getTestCountBySkill = (skill: string) => {
    if (skill === 'All') return mockTestSets.length;
    return mockTestSets.filter(t => t.tags.includes(skill)).length;
  };

  // Lọc bài tập theo kỹ năng và dạng bài được chọn
  const filteredExercises = mockExercises.filter(e => {
    if (e.skill !== selectedSkill) return false;
    if (selectedQuestionType && selectedQuestionType !== 'All') {
      return e.type.toLowerCase().includes(selectedQuestionType.toLowerCase()) || 
             selectedQuestionType.toLowerCase().includes(e.type.toLowerCase());
    }
    return true;
  });

  return (
    <div className="w-full max-w-[1536px] mx-auto space-y-5 px-1 sm:px-2">
      {/* 1. Header Banner - Tinh Gọn & Hiện Đại (Compact Modern Banner) */}
      <div className="bg-gradient-to-r from-[#932120] via-[#821d1c] to-[#6a1514] rounded-2xl p-5 md:py-4.5 md:px-7 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="relative z-10 space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-white/20 text-white backdrop-blur-xs tracking-wider uppercase">
              IELTS Academic & General
            </span>
            <span className="text-white/60 text-xs hidden sm:inline">•</span>
            <span className="text-white/80 text-xs font-medium hidden sm:inline">Chuẩn đề thi quốc tế</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
            Kho Luyện Thi IELTS Toàn Diện 4 Kỹ Năng
          </h1>
          <p className="text-white/85 text-xs md:text-sm max-w-xl font-normal leading-relaxed">
            Hệ thống phòng thi chuẩn Cambridge, phân tích bẫy đề thi và AI chấm điểm đa tiêu chí.
          </p>
        </div>

        {/* 3 Quick Badges thay thế cho icon mờ khổng lồ */}
        <div className="relative z-10 flex flex-wrap md:flex-col lg:flex-row items-start md:items-end lg:items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-medium text-white/95 shadow-2xs">
            <Award className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>4 Kỹ năng Cambridge</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-medium text-white/95 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-rose-300 shrink-0" />
            <span>AI Chấm điểm chi tiết</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15 text-xs font-medium text-white/95 shadow-2xs">
            <Target className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <span>Thi & Luyện tập độc lập</span>
          </div>
        </div>
      </div>

      {/* 2. Tabs Switcher: Khám phá bộ đề vs Luyện theo kỹ năng */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex space-x-1.5 bg-zinc-100 p-1 rounded-xl w-fit border border-zinc-200">
          <button 
            id="btn-tab-explore"
            onClick={() => setActiveTab('explore')}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'explore' 
                ? 'bg-white text-[#932120] shadow-xs' 
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Library className="w-4 h-4" />
            Khám phá bộ đề
          </button>
          <button 
            id="btn-tab-skills"
            onClick={() => {
              setActiveTab('by-type');
              setSelectedQuestionType(null);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === 'by-type' 
                ? 'bg-white text-[#932120] shadow-xs' 
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <Target className="w-4 h-4" />
            Luyện theo kỹ năng
          </button>
        </div>

        {activeTab === 'explore' && (
          <div className="text-xs font-semibold text-zinc-500 hidden sm:block">
            Tổng cộng: <strong className="text-zinc-800">{mockTestSets.length}</strong> bộ đề hoàn chỉnh
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: KHÁM PHÁ BỘ ĐỀ */}
      {/* ========================================================================= */}
      {activeTab === 'explore' && (
        <div className="space-y-4">
          {/* Filters Bar & Search */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 bg-white p-3 sm:p-3.5 rounded-2xl border border-zinc-200 shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider mr-1.5 shrink-0">
                Kỹ năng:
              </span>
              {(['All', 'Reading', 'Listening', 'Writing', 'Speaking'] as const).map((s) => {
                const count = getTestCountBySkill(s);
                const isSelected = skillFilter === s;
                return (
                  <button
                    key={s}
                    id={`filter-skill-${s.toLowerCase()}`}
                    onClick={() => setSkillFilter(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#932120] text-white shadow-xs'
                        : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                    }`}
                  >
                    <span>{s === 'All' ? 'Tất cả' : s}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-600'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <div className="relative w-full sm:w-72 shrink-0">
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên đề..." 
                className="w-full pl-9 pr-4 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/30 font-medium transition-all"
              />
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 1: CÁC BỘ ĐỀ THI NỔI BẬT (CHUẨN PREPEDU) */}
          {/* ========================================================================= */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <Library className="w-4 h-4 text-[#932120]" />
                  <span>Bộ Đề Thi Tuyển Chọn</span>
                </h3>
                <p className="text-xs text-zinc-500 font-medium">Chọn bộ đề để khám phá các đề thi và rẽ nhánh làm bài theo từng kỹ năng</p>
              </div>
              <span className="text-xs font-semibold text-zinc-500 hidden sm:inline-block">
                {mockExamCollections.length} bộ đề hoàn chỉnh
              </span>
            </div>

            {/* Grid các Bộ đề Chuẩn Ảnh PrepEdu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {mockExamCollections.map((col) => {
                return (
                  <Link
                    key={col.id}
                    href={`/test-practice/set/${col.id}`}
                    className="bg-white rounded-2xl border border-zinc-200 shadow-2xs hover:shadow-md transition-all group overflow-hidden flex flex-col hover:border-[#932120]/40"
                  >
                    {/* Cover image với badge HOT & Bookmark */}
                    <div className="h-40 bg-zinc-100 relative overflow-hidden shrink-0">
                      <img 
                        src={col.imageUrl} 
                        alt={col.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
                      
                      {col.isHot && (
                        <div className="absolute top-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-red-600 text-white text-[10px] font-black rounded-lg shadow-xs uppercase tracking-wider">
                          <Flame className="w-3 h-3 fill-white" />
                          <span>HOT</span>
                        </div>
                      )}

                      <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-white/80 backdrop-blur-xs flex items-center justify-center text-zinc-600 hover:text-[#932120]">
                        <Bookmark className="w-3.5 h-3.5" />
                      </div>

                      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                        <h4 className="font-bold text-xs sm:text-sm line-clamp-1 text-white group-hover:text-amber-200 transition-colors">
                          {col.title}
                        </h4>
                      </div>
                    </div>

                    {/* Metadata: Tiến độ và biểu tượng kỹ năng */}
                    <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                      <div className="flex items-center justify-between text-xs text-zinc-600 font-medium">
                        <span className="text-[11px] font-semibold text-zinc-500">
                          {col.completedTestsCount}/{col.testsCount} tests
                        </span>
                        
                        {/* Skills icons */}
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          {col.skillsIncluded.includes('Listening') && (
                            <span title="Listening"><Headphones className="w-3.5 h-3.5" /></span>
                          )}
                          {col.skillsIncluded.includes('Reading') && (
                            <span title="Reading"><BookOpen className="w-3.5 h-3.5" /></span>
                          )}
                          {col.skillsIncluded.includes('Writing') && (
                            <span title="Writing"><PenTool className="w-3.5 h-3.5" /></span>
                          )}
                          {col.skillsIncluded.includes('Speaking') && (
                            <span title="Speaking"><Mic className="w-3.5 h-3.5" /></span>
                          )}
                        </div>
                      </div>

                      <div className="pt-1 border-t border-zinc-100 flex items-center justify-between text-[11px] font-bold text-[#932120] group-hover:translate-x-0.5 transition-transform">
                        <span>Chi tiết bộ đề</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: DANH SÁCH TẤT CẢ BÀI THI LẺ */}
          {/* ========================================================================= */}
          <div className="pt-2">
            <h3 className="text-base font-black text-zinc-900 tracking-tight mb-3">
              Danh Sách Đề Thi Luyện Tập Trực Tiếp
            </h3>

            {/* Test Sets Grid (1 - 2 - 3 - 4 Cột Cân Đối) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4.5">
              {filteredTestSets.map((testSet) => {
                const detectedSkill = getSkillFromTags(testSet.tags);
                const duration = testSet.durationMinutes || (detectedSkill === 'Reading' || detectedSkill === 'Writing' ? 60 : detectedSkill === 'Listening' ? 30 : 14);
                const questionsText = detectedSkill === 'Reading' || detectedSkill === 'Listening' 
                  ? '40 câu hỏi' 
                  : detectedSkill === 'Writing' 
                  ? 'Task 1 và Task 2' 
                  : '3 Parts';

                return (
                  <div 
                    key={testSet.id} 
                    className="bg-white rounded-2xl border border-zinc-200 shadow-2xs hover:shadow-md transition-all group flex flex-col overflow-hidden"
                  >
                    {/* Card Cover Image (16:9 Aspect Ratio) */}
                    <div className="h-36 bg-zinc-100 relative overflow-hidden shrink-0">
                      <img 
                        src={testSet.imageUrl} 
                        alt={testSet.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      
                      {/* Skill Badge */}
                      <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                        <span className="px-2.5 py-0.5 bg-[#932120] text-white text-[11px] font-black rounded-lg shadow-xs uppercase tracking-wider">
                          {detectedSkill}
                        </span>
                      </div>

                      {/* Tags at Bottom of Image */}
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white flex items-center justify-between text-xs">
                        <span className="font-medium text-white/90 truncate">
                          {testSet.tags.join(' • ')}
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div>
                        <h3 className="font-bold text-zinc-900 text-sm line-clamp-2 leading-snug group-hover:text-[#932120] transition-colors min-h-[2.5rem]">
                          {testSet.title}
                        </h3>

                        {/* Metadata Row: Duration & Questions count */}
                        <div className="flex items-center gap-3 text-xs text-zinc-500 font-medium mt-2 pt-2 border-t border-zinc-100">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {duration} phút
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {questionsText}
                          </span>
                        </div>
                      </div>

                      {/* Card Actions: ĐÃ BỎ NÚT KẾT QUẢ - CHỈ CÒN DUY NHẤT NÚT VÀO LÀM BÀI */}
                      <div className="pt-2">
                        <button 
                          onClick={() => setActiveTestPrep({ 
                            id: testSet.id, 
                            title: testSet.title, 
                            skill: detectedSkill 
                          })}
                          className="w-full h-9 bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold rounded-xl transition-all shadow-xs active:scale-95 flex items-center justify-center text-center"
                        >
                          Vào làm bài
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {filteredTestSets.length === 0 && (
            <div className="bg-white p-12 rounded-2xl border border-zinc-200 text-center space-y-2">
              <Library className="w-10 h-10 text-zinc-300 mx-auto" />
              <h4 className="font-bold text-zinc-800 text-base">Không tìm thấy bộ đề phù hợp</h4>
              <p className="text-xs text-zinc-500">Vui lòng thử tìm kiếm với từ khóa khác hoặc chuyển bộ lọc kỹ năng.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: LUYỆN THEO KỸ NĂNG */}
      {/* ========================================================================= */}
      {activeTab === 'by-type' && (
        <div className="space-y-4">
          {/* 4 Skill Selector Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-white p-2 rounded-2xl border border-zinc-200 shadow-2xs">
            {(['Reading', 'Listening', 'Writing', 'Speaking'] as const).map((skill) => {
              const isSelected = selectedSkill === skill;
              const exerciseCount = mockExercises.filter(e => e.skill === skill).length;
              return (
                <button 
                  key={skill}
                  id={`tab-skill-${skill.toLowerCase()}`}
                  onClick={() => {
                    setSelectedSkill(skill);
                    setSelectedQuestionType(null);
                  }}
                  className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    isSelected 
                      ? 'bg-[#932120] text-white shadow-xs' 
                      : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                  }`}
                >
                  {skill === 'Listening' && <Headphones className="w-4 h-4" />}
                  {skill === 'Reading' && <BookOpen className="w-4 h-4" />}
                  {skill === 'Writing' && <PenTool className="w-4 h-4" />}
                  {skill === 'Speaking' && <Mic className="w-4 h-4" />}
                  <span>{skill}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-zinc-200 text-zinc-600'
                  }`}>
                    {exerciseCount}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 2-Column Balanced Layout */}
          <div className="flex flex-col lg:flex-row gap-5 items-start">
            {/* Left Column: Question Types Categories (Tương Tác Lọc Dạng Bài) */}
            <div className="w-full lg:w-72 xl:w-80 bg-white rounded-2xl border border-zinc-200 shadow-2xs overflow-hidden shrink-0">
              <div className="p-3.5 bg-zinc-50 border-b border-zinc-200 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm">Dạng bài tiêu biểu</h3>
                  <p className="text-[11px] text-zinc-500">{mockQuestionTypes[selectedSkill]?.length || 0} Dạng bài chuẩn {selectedSkill}</p>
                </div>
                <Filter className="w-4 h-4 text-zinc-400" />
              </div>

              <div className="p-2 space-y-1 max-h-[540px] overflow-y-auto custom-scrollbar">
                {/* Nút Xem Tất Cả Dạng Bài */}
                <button
                  id="btn-filter-all-types"
                  onClick={() => setSelectedQuestionType(null)}
                  className={`w-full text-left p-3 rounded-xl transition-all border ${
                    selectedQuestionType === null
                      ? 'bg-red-50/80 border-[#932120] text-[#932120] font-bold shadow-2xs'
                      : 'border-transparent text-zinc-700 hover:bg-zinc-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold">Tất cả dạng bài</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-bold">
                      {mockExercises.filter(e => e.skill === selectedSkill).length}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-0.5 font-normal">Hiển thị toàn bộ bài tập luyện tập</p>
                </button>

                {/* Danh sách từng dạng bài */}
                {mockQuestionTypes[selectedSkill]?.map((type) => {
                  const isActive = selectedQuestionType === type.name;
                  const countForType = mockExercises.filter(
                    e => e.skill === selectedSkill && 
                    (e.type.toLowerCase().includes(type.name.toLowerCase()) || type.name.toLowerCase().includes(e.type.toLowerCase()))
                  ).length;

                  return (
                    <button
                      key={type.id}
                      id={`btn-qtype-${type.id}`}
                      onClick={() => setSelectedQuestionType(type.name)}
                      className={`w-full text-left p-3 rounded-xl transition-all border ${
                        isActive
                          ? 'bg-red-50/80 border-[#932120] text-[#932120] font-bold shadow-2xs'
                          : 'border-transparent text-zinc-700 hover:bg-zinc-50'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold leading-tight">{type.name}</span>
                        {countForType > 0 && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold shrink-0 ${
                            isActive ? 'bg-[#932120] text-white' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {countForType}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 font-normal flex items-center justify-between">
                        <span>Độ chính xác:</span>
                        <strong className="text-emerald-700 font-bold">{type.accuracy > 0 ? `${type.accuracy}%` : '-.-'}</strong>
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Practice Exercises (Lưới 2 Cột Cân Xứng) */}
            <div className="flex-1 w-full min-w-0 space-y-3.5">
              <div className="flex justify-between items-center bg-white p-3.5 rounded-2xl border border-zinc-200 shadow-2xs">
                <div>
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base">
                    Danh sách bài tập • {selectedSkill}
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {selectedQuestionType ? (
                      <>Đang lọc theo: <strong className="text-[#932120]">{selectedQuestionType}</strong> ({filteredExercises.length} bài)</>
                    ) : (
                      <>Hiển thị {filteredExercises.length} bài tập chuyên biệt</>
                    )}
                  </p>
                </div>

                {selectedQuestionType && (
                  <button
                    onClick={() => setSelectedQuestionType(null)}
                    className="text-xs font-bold text-zinc-500 hover:text-[#932120] underline transition-colors"
                  >
                    Xóa lọc
                  </button>
                )}
              </div>

              {/* Exercises Grid (2 Cột Cân Đối) */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-3.5">
                {filteredExercises.map((exercise) => {
                  let practicePath = `/test-practice/reading/cam-18-test-1-reading?mode=practice`;
                  if (exercise.skill === 'Listening') practicePath = `/test-practice/listening/cam-18-test-1-listening?mode=practice`;
                  if (exercise.skill === 'Writing') practicePath = `/test-practice/writing/cam-18-test-1-writing?mode=practice`;
                  if (exercise.skill === 'Speaking') practicePath = `/test-practice/speaking/cam-18-test-1-speaking?mode=practice`;

                  const difficulty = exercise.difficulty || 'Trung bình';
                  const diffColor = difficulty === 'Dễ' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : difficulty === 'Nâng cao'
                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <div 
                      key={exercise.id} 
                      className="bg-white p-4.5 rounded-2xl border border-zinc-200 shadow-2xs hover:border-zinc-300 hover:shadow-xs transition-all flex flex-col justify-between gap-3.5"
                    >
                      <div className="space-y-2">
                        {/* Type & Difficulty Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 text-[11px] font-bold rounded-md uppercase tracking-wider truncate max-w-[200px]">
                            {exercise.type}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${diffColor}`}>
                            {difficulty}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-zinc-900 text-sm leading-snug line-clamp-2">
                          {exercise.title}
                        </h4>
                      </div>

                      {/* Footer: Stats & Start Button */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 text-xs">
                        <div className="flex items-center gap-2.5 text-zinc-500 font-medium">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3.5 h-3.5 text-zinc-400" />
                            {exercise.questionCount} câu
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            {exercise.timeMinutes || 8} phút
                          </span>
                        </div>

                        <Link 
                          href={practicePath}
                          className="px-4 py-2 bg-zinc-900 hover:bg-[#932120] text-white text-xs font-bold rounded-xl transition-all whitespace-nowrap shadow-2xs"
                        >
                          Bắt đầu luyện
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredExercises.length === 0 && (
                <div className="bg-white p-12 rounded-2xl border border-zinc-200 shadow-2xs flex flex-col items-center justify-center text-center space-y-2">
                  <BookOpen className="w-10 h-10 text-zinc-300" />
                  <h4 className="font-bold text-zinc-900 text-sm">Chưa có bài tập cho dạng bài này</h4>
                  <p className="text-xs text-zinc-500">Vui lòng chọn dạng bài khác hoặc chuyển sang kỹ năng tiếp theo.</p>
                  <button
                    onClick={() => setSelectedQuestionType(null)}
                    className="mt-2 px-4 py-2 bg-[#932120] text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Xem tất cả dạng bài {selectedSkill}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Prep Modal */}
      {activeTestPrep && (
        <TestPrepModal 
          testId={activeTestPrep.id}
          testTitle={activeTestPrep.title}
          skill={activeTestPrep.skill}
          onClose={() => setActiveTestPrep(null)}
        />
      )}
    </div>
  );
}
