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
  Headphones, 
  PenTool, 
  Mic, 
  Clock, 
  ArrowLeft,
  Crown,
  FileCheck2,
  FileEdit
} from 'lucide-react';
import { mockExamCollections } from '@/mocks/test-sets';
import { TestPrepModal } from '@/components/exam/TestPrepModal';

export default function TestSkillsListPage() {
  const params = useParams();
  const router = useRouter();
  const setId = params?.setId as string;
  const testId = params?.testId as string;

  const collection = mockExamCollections.find((c) => c.id === setId) || mockExamCollections[0];
  const test = collection.tests.find((t) => t.id === testId) || collection.tests[0];

  const [activePrepModal, setActivePrepModal] = useState<{
    skill: 'Reading' | 'Listening' | 'Writing' | 'Speaking';
    testId: string;
    title: string;
  } | null>(null);

  const getSkillIcon = (skill: string) => {
    switch (skill) {
      case 'Listening':
        return <Headphones className="w-5 h-5 text-blue-600" />;
      case 'Reading':
        return <BookOpen className="w-5 h-5 text-blue-600" />;
      case 'Writing':
        return <PenTool className="w-5 h-5 text-blue-600" />;
      case 'Speaking':
        return <Mic className="w-5 h-5 text-blue-600" />;
      default:
        return <BookOpen className="w-5 h-5 text-blue-600" />;
    }
  };

  const mapSkillToRoute = (skill: string) => {
    return skill.toLowerCase();
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6 px-2 sm:px-4 py-3">
      {/* Breadcrumb theo chuẩn ảnh 4 PrepEdu */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-zinc-500 overflow-x-auto whitespace-nowrap custom-scrollbar pb-1">
        <Link href="/test-practice" className="hover:text-[#932120] flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Test Practice</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
        <Link href={`/test-practice/set/${collection.id}`} className="hover:text-[#932120] transition-colors">
          {collection.title}
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-zinc-300 shrink-0" />
        <span className="text-zinc-800 font-bold">{test.title}</span>
      </nav>

      {/* Header Danh Sách Kỹ Năng */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight">
            Danh sách kỹ năng
          </h1>
          <p className="text-xs text-zinc-500 font-medium mt-1">
            Chọn kỹ năng để bắt đầu làm bài hoặc xem lại lịch sử kết quả các lần thi trước
          </p>
        </div>

        <Link
          href={`/test-practice/set/${collection.id}`}
          className="px-3.5 py-1.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 flex items-center gap-1.5 transition-all shadow-2xs"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Quay lại bộ đề</span>
        </Link>
      </div>

      {/* Danh sách các card kỹ năng theo chuẩn ảnh 4 & 5 PrepEdu */}
      <div className="space-y-4">
        {test.skills.map((skillItem) => {
          const isCompleted = skillItem.status === 'completed';
          const isDraft = skillItem.status === 'draft';
          const skillRoute = mapSkillToRoute(skillItem.skill);

          return (
            <div 
              key={skillItem.skill}
              className="bg-white rounded-3xl border border-zinc-200 shadow-2xs overflow-hidden transition-all hover:border-zinc-300"
            >
              {/* Header của Kỹ năng (Icon + Tên Kỹ năng + Nút Làm bài/Làm lại) */}
              <div className="p-5 sm:p-6 flex items-center justify-between gap-4 border-b border-zinc-100">
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0">
                    {getSkillIcon(skillItem.skill)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                        {skillItem.skill}
                      </h3>
                      {skillItem.hasVirtualRoom && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200/60">
                          <Crown className="w-3 h-3 text-amber-500 fill-amber-500" />
                          <span>Virtual {skillItem.skill} Room</span>
                        </span>
                      )}
                    </div>
                    {isDraft && (
                      <p className="text-xs text-amber-600 font-semibold mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>Đang có bản nháp lưu lúc {skillItem.draftTime || 'hôm nay'}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Nút hành động chính */}
                <div className="shrink-0">
                  {isCompleted ? (
                    <button
                      onClick={() => setActivePrepModal({
                        skill: skillItem.skill,
                        testId: test.id,
                        title: `${test.title} - ${skillItem.skill}`,
                      })}
                      className="h-9 px-4.5 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-100/70 text-blue-700 text-xs font-bold transition-all flex items-center gap-2 shadow-2xs active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Làm lại</span>
                    </button>
                  ) : isDraft ? (
                    <Link
                      href={`/test-practice/${skillRoute}/${test.id}`}
                      className="h-9 px-5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95"
                    >
                      <FileEdit className="w-3.5 h-3.5" />
                      <span>Tiếp tục làm bài</span>
                    </Link>
                  ) : (
                    <button
                      onClick={() => setActivePrepModal({
                        skill: skillItem.skill,
                        testId: test.id,
                        title: `${test.title} - ${skillItem.skill}`,
                      })}
                      className="h-9 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-xs active:scale-95"
                    >
                      <span>Làm bài</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Lịch sử các lần làm bài (Hiển thị nếu đã có lần nộp - Chuẩn ảnh 4) */}
              {isCompleted && skillItem.attempts.length > 0 && (
                <div className="bg-zinc-50/60 p-4 sm:px-6 space-y-3">
                  {skillItem.attempts.map((att) => (
                    <div 
                      key={att.id}
                      className="bg-white rounded-2xl border border-zinc-200/80 p-3.5 sm:px-4 flex items-center justify-between gap-4 shadow-2xs hover:border-zinc-300 transition-colors"
                    >
                      <div className="flex items-center gap-3.5">
                        {/* Badge điểm tròn xanh lá chuẩn ảnh 4 */}
                        <div className="w-9 h-9 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-black text-sm flex items-center justify-center shrink-0">
                          {att.bandScore.toFixed(1)}
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-zinc-900">
                            Làm bài lần {att.attemptNumber}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-medium">
                            Gửi bài lúc {att.submittedAt}
                          </p>
                        </div>
                      </div>

                      {/* Nút Xem chi tiết > điều hướng sang Màn hình Kết quả tóm tắt */}
                      <Link
                        href={`/test-practice/${skillRoute}/${test.id}/summary?attemptId=${att.id}`}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 group/link"
                      >
                        <span>Xem chi tiết</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal Chuẩn Bị & Bắt Đầu Làm Bài (Hỗ trợ phân định Luyện thi / Luyện tập) */}
      {activePrepModal && (
        <TestPrepModal
          testId={activePrepModal.testId}
          testTitle={activePrepModal.title}
          skill={activePrepModal.skill}
          onClose={() => setActivePrepModal(null)}
        />
      )}
    </div>
  );
}
