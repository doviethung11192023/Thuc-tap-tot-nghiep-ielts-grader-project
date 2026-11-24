"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Plus, Loader2, Clock, ShieldAlert, Copy, Lock } from "lucide-react";
import {
  getTestDetail,
  updateTest,
  updateTestStatus,
  cloneTestToDraft,
  createSection,
} from "@/services/admin-content";
import { SectionEditor } from "@/components/admin/SectionEditor";
import type { TestItem, ContentStatus, AllowedMode, TestDifficulty } from "@/types/exam";

export default function ExamBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const testId = params.testId as string;

  const [test, setTest] = useState<TestItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloning, setCloning] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState<TestDifficulty>("medium");
  const [durationMin, setDurationMin] = useState(60);
  const [status, setStatus] = useState<ContentStatus>("draft");
  const [allowedMode, setAllowedMode] = useState<AllowedMode>("both");

  const loadTest = useCallback(async () => {
    try {
      const data = await getTestDetail(testId);
      setTest(data);
      setTitle(data.title);
      setDifficulty((data.difficulty as TestDifficulty) || "medium");
      setDurationMin(data.duration_min || 60);
      setStatus(data.status);
      setAllowedMode(data.allowed_mode);
    } catch (err) {
      console.error("Failed to load test:", err);
      toast.error("Không thể tải chi tiết bài thi");
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => { loadTest(); }, [loadTest]);

  const isLocked = test ? test.status !== "draft" : false;

  const handleSaveMetadata = async () => {
    if (!test) return;
    setSaving(true);
    try {
      if (isLocked) {
        if (status !== test.status) {
          await updateTestStatus(testId, status);
          toast.success(`Đã chuyển trạng thái bài thi sang ${status}!`);
          await loadTest();
        } else {
          toast.error("Đề đã xuất bản không sửa trực tiếp được — hãy tạo bản nháp mới (BR-10)");
        }
        return;
      }
      await updateTest(testId, {
        title: title.trim(),
        difficulty,
        duration_min: durationMin,
        status,
        allowed_mode: allowedMode,
      });
      toast.success("Đã lưu thông tin bài thi thành công!");
      await loadTest();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Lỗi khi lưu thông tin bài thi");
    } finally {
      setSaving(false);
    }
  };

  const handleCloneDraft = async () => {
    setCloning(true);
    try {
      const cloned = await cloneTestToDraft(testId);
      toast.success("Đã tạo bản nháp mới từ đề thi!");
      router.push(`/admin/tests/${cloned.id}/edit`);
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Không thể tạo bản nháp mới");
    } finally {
      setCloning(false);
    }
  };

  const handleAddSection = async () => {
    if (isLocked) return;
    const nextOrder = (test?.sections?.length || 0) + 1;
    try {
      await createSection(testId, {
        order_no: nextOrder,
        title: `Phần thi ${nextOrder}`,
        passage_text: test?.skill === "reading" ? "Nhập nội dung bài đọc..." : undefined,
      });
      toast.success("Đã thêm Section mới");
      loadTest();
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || "Lỗi khi thêm section mới");
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#932120] mb-3" />
        <span className="text-sm text-zinc-500 font-medium">Đang tải Exam Builder...</span>
      </div>
    );
  }

  if (!test) {
    return (
      <div className="py-16 text-center">
        <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-2" />
        <h2 className="text-lg font-bold text-zinc-800">Không tìm thấy bài thi</h2>
        <Link href="/admin/tests" className="mt-4 inline-block text-xs text-[#932120] font-bold underline">
          Quay lại danh sách đề thi
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      {isLocked && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm text-amber-900 space-y-0.5">
              <p className="font-bold">Đề thi đang ở trạng thái {test.status === "published" ? "Đã xuất bản" : "Đã lưu trữ"} (chỉ đọc theo BR-10)</p>
              <p className="text-amber-800">Không thể sửa nội dung đề đã xuất bản để bảo toàn lịch sử điểm. Hãy nhân bản sang bản nháp mới nếu cần chỉnh sửa.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloneDraft}
            disabled={cloning}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
          >
            {cloning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
            Tạo phiên bản nháp mới
          </button>
        </div>
      )}

      <div className="bg-white p-5 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <Link href="/admin/tests" className="p-2.5 border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-600 shadow-2xs transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold uppercase bg-red-50 text-[#932120] border border-red-200/60">{test.skill}</span>
              <span className="text-xs text-zinc-400 font-mono">ID: {test.id.slice(0, 8)}...</span>
            </div>
            <input type="text" value={title} disabled={isLocked} onChange={(e) => setTitle(e.target.value)} className="text-lg sm:text-2xl font-extrabold text-zinc-900 border-b border-transparent hover:border-zinc-300 focus:border-[#932120] focus:outline-none px-0.5 mt-1 w-full disabled:bg-transparent disabled:text-zinc-700" />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={status} onChange={(e) => setStatus(e.target.value as ContentStatus)} className="px-3.5 py-2.5 border border-zinc-300 rounded-xl text-xs sm:text-sm font-semibold bg-white focus:outline-none focus:ring-1 focus:ring-[#932120] shadow-2xs">
            {!isLocked && <option value="draft">Bản nháp (Draft)</option>}
            <option value="published">Xuất bản (Published)</option>
            <option value="archived">Lưu trữ (Archived)</option>
          </select>
          <button onClick={handleSaveMetadata} disabled={saving || (isLocked && status === test.status)} className="px-5 py-2.5 bg-[#932120] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#7a1a19] disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs cursor-pointer">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu thay đổi
          </button>
        </div>
      </div>

      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs sm:text-sm">
        <div>
          <label className="block text-zinc-600 font-bold mb-1.5 uppercase text-xs tracking-wider">Thời lượng (phút):</label>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
            <input type="number" min={1} value={durationMin} disabled={isLocked} onChange={(e) => setDurationMin(parseInt(e.target.value) || 60)} className="w-full px-3 py-2 border border-zinc-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#932120] disabled:bg-zinc-50" />
          </div>
        </div>
        <div>
          <label className="block text-zinc-600 font-bold mb-1.5 uppercase text-xs tracking-wider">Mức độ khó:</label>
          <select value={difficulty} disabled={isLocked} onChange={(e) => setDifficulty(e.target.value as TestDifficulty)} className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#932120] disabled:bg-zinc-50">
            <option value="easy">Dễ (Easy)</option>
            <option value="medium">Vừa (Medium)</option>
            <option value="hard">Khó (Hard)</option>
          </select>
        </div>
        <div>
          <label className="block text-zinc-600 font-bold mb-1.5 uppercase text-xs tracking-wider">Chế độ cho phép:</label>
          <select value={allowedMode} disabled={isLocked} onChange={(e) => setAllowedMode(e.target.value as AllowedMode)} className="w-full px-3 py-2 border border-zinc-300 rounded-xl bg-white focus:outline-none focus:ring-1 focus:ring-[#932120] disabled:bg-zinc-50">
            <option value="both">Cả hai (Both)</option>
            <option value="practice">Chỉ Luyện tập</option>
            <option value="mock">Chỉ Thi thử</option>
          </select>
        </div>
        <div>
          <label className="block text-zinc-600 font-bold mb-1.5 uppercase text-xs tracking-wider">Bộ đề thi (Test Set):</label>
          <div className="py-2 px-3 bg-zinc-50 rounded-xl text-zinc-700 font-semibold border border-zinc-200 truncate">{test.test_sets?.name || "Không phân loại"}</div>
        </div>
      </div>

      <div className="space-y-4 w-full">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:base font-bold text-zinc-800 uppercase tracking-wide">Các phần thi (Sections - {test.sections?.length || 0})</h2>
          {!isLocked && (
            <button onClick={handleAddSection} className="px-4 py-2 bg-zinc-100 text-zinc-800 rounded-xl text-xs sm:text-sm font-bold hover:bg-zinc-200 transition-colors flex items-center gap-2 border border-zinc-300 shadow-2xs cursor-pointer">
              <Plus className="w-4 h-4 text-[#932120]" /> Thêm Section
            </button>
          )}
        </div>

        {test.sections && test.sections.length > 0 ? (
          test.sections.map((sec) => (
            <SectionEditor key={sec.id} section={sec} skill={test.skill} readOnly={isLocked} onRefresh={loadTest} />
          ))
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-zinc-200 text-zinc-500 text-sm">
            Bài thi này chưa có section nào. Nhấn <strong>&quot;Thêm Section&quot;</strong> để bắt đầu soạn bài.
          </div>
        )}
      </div>
    </div>
  );
}
