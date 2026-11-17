"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Clock, 
  FileText, 
  Mic, 
  CheckCircle2, 
  ChevronRight, 
  ArrowRight,
  Loader2, 
  AlertTriangle
} from "lucide-react";
import {
  getExpertAssignments,
  getAssignmentWorkspace,
  declineAssignment,
  startAssignmentGrading,
} from "@/services/expert";
import type { ExpertAssignment } from "@/types";
import toast from "react-hot-toast";

export default function ExpertAssignmentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"active" | "completed">("active");

  const { data: assignments = [], isLoading: loading } = useQuery<ExpertAssignment[]>({
    queryKey: ["expert-assignments", tab],
    queryFn: () => getExpertAssignments(tab),
    staleTime: 60 * 1000,
  });

  // State cho Modal từ chối
  const [declineModalItem, setDeclineModalItem] = useState<ExpertAssignment | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [isSubmittingDecline, setIsSubmittingDecline] = useState(false);

  const prefetchWorkspace = (assignmentId: string) => {
    void queryClient.prefetchQuery({
      queryKey: ["expert-workspace", assignmentId],
      queryFn: () => getAssignmentWorkspace(assignmentId),
      staleTime: 60 * 1000,
    });
  };

  const handleStartGrading = async (item: ExpertAssignment) => {
    try {
      if (!item.started_at) {
        await startAssignmentGrading(item.id);
        void queryClient.invalidateQueries({ queryKey: ["expert-assignments"] });
      }
      router.push(`/expert/assignments/${item.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi bắt đầu chấm bài");
    }
  };

  const handleConfirmDecline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declineModalItem || !declineReason.trim()) return;

    try {
      setIsSubmittingDecline(true);
      await declineAssignment(declineModalItem.id, declineReason.trim());
      toast.success("Đã từ chối bài chấm thành công (hệ thống sẽ phân công người khác)");
      setDeclineModalItem(null);
      setDeclineReason("");
      void queryClient.invalidateQueries({ queryKey: ["expert-assignments"] });
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Lỗi khi từ chối nhận bài");
    } finally {
      setIsSubmittingDecline(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Hàng Đợi Bài Chấm Khảo Thí</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Quản lý các bài thi Writing & Speaking được phân công thẩm định. SLA hoàn thành trong 48 giờ làm việc (BR-11).
          </p>
        </div>

        {/* Tab Filters */}
        <div className="inline-flex p-1 bg-zinc-100 rounded-xl border border-zinc-200">
          <button
            onClick={() => setTab("active")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === "active"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Đang chấm / Cần chấm
          </button>
          <button
            onClick={() => setTab("completed")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              tab === "completed"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Lịch sử hoàn tất
          </button>
        </div>
      </div>

      {/* Main List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
          <span className="text-sm font-medium text-zinc-500">Đang tải danh sách bài tập...</span>
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center space-y-3 shadow-xs">
          <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-zinc-900">Không có bài chấm nào trong danh sách</h3>
          <p className="text-sm text-zinc-500 max-w-sm mx-auto">
            {tab === "active" 
              ? "Hiện tại bạn đã chấm xong tất cả các bài được phân công. Hãy bật trạng thái Nhận bài ở trang Profile để tiếp tục nhận bài mới."
              : "Bạn chưa có lịch sử bài thi đã chấm nào."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {assignments.map((item) => {
            const isSpeaking = item.skill === "speaking";
            const isUrgent = item.remaining_hours <= 6 && !item.ended_at;

            return (
              <div
                key={item.id}
                onMouseEnter={() => prefetchWorkspace(item.id)}
                className={`bg-white rounded-2xl border transition-all p-5 shadow-xs hover:shadow-md ${
                  isUrgent ? "border-amber-400 bg-amber-50/20" : "border-zinc-200"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Info Column */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Skill Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                        isSpeaking ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {isSpeaking ? <Mic className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                        {isSpeaking ? "Speaking" : "Writing"}
                      </span>

                      {/* Source Badge */}
                      <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${
                        item.source === "mock" ? "bg-rose-100 text-[#932120]" : "bg-zinc-100 text-zinc-700"
                      }`}>
                        {item.source === "mock" ? "Mock Test (Thi thử)" : "Practice (Luyện tập)"}
                      </span>

                      <span className="px-2 py-1 rounded-md text-[11px] font-mono font-semibold bg-zinc-100 text-zinc-600">
                        #{item.attempt_id.slice(0, 8)}
                      </span>

                      {/* Status / SLA Badge */}
                      {!item.ended_at ? (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                          isUrgent ? "bg-red-100 text-red-700 animate-pulse" : "bg-zinc-100 text-zinc-600"
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          Hạn chót: Còn {item.remaining_hours} giờ
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Đã hoàn thành
                        </span>
                      )}
                    </div>

                    <h2 className="text-base font-bold text-zinc-900">
                      {item.test_title}
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
                      {(item.learner_name || item.learner_email) && (
                        <>
                          <span className="font-semibold text-zinc-700">
                            Học viên: {item.learner_name || item.learner_email}
                            {item.learner_name && item.learner_email ? ` (${item.learner_email})` : ""}
                          </span>
                          <span>•</span>
                        </>
                      )}
                      <span>Phân công lúc: {new Date(item.assigned_at).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                      <span>•</span>
                      <span>Hạn trả: {new Date(item.due_at).toLocaleDateString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-3">
                    {/* Nút từ chối nhận bài trong 2h đầu (FR-39) */}
                    {item.can_decline && (
                      <button
                        onClick={() => {
                          setDeclineModalItem(item);
                          setDeclineReason("");
                        }}
                        className="px-3.5 py-2 text-xs font-bold text-zinc-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors border border-zinc-200 cursor-pointer"
                      >
                        Từ chối nhận bài
                      </button>
                    )}

                    {!item.ended_at ? (
                      <button
                        onClick={() => void handleStartGrading(item)}
                        className="px-5 py-2.5 bg-[#932120] hover:bg-[#7a1a19] text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer"
                      >
                        {item.started_at ? "Tiếp tục chấm" : "Bắt đầu chấm bài"}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <Link
                        href={`/expert/assignments/${item.id}`}
                        className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
                      >
                        Xem kết quả đã chấm
                        <ChevronRight className="w-4 h-4" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal từ chối nhận bài (FR-39) */}
      {declineModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-[#932120]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Từ chối nhận bài chấm</h3>
                <p className="text-xs text-zinc-500">Quyền từ chối trong 2 giờ đầu làm việc (FR-39)</p>
              </div>
            </div>

            <p className="text-xs text-zinc-600 leading-relaxed">
              Bài chấm sẽ được chuyển lại vào hàng đợi để tự động giao cho Chuyên gia khác. Bạn sẽ không nhận lại chính bài thi này nữa.
            </p>

            <form onSubmit={handleConfirmDecline} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Lý do từ chối (bắt buộc):
                </label>
                <textarea
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  rows={3}
                  required
                  placeholder="Ví dụ: Bận lịch đột xuất, bài nộp audio bị rè không nghe rõ..."
                  className="w-full text-xs p-3 border border-zinc-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#932120]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  disabled={isSubmittingDecline}
                  onClick={() => setDeclineModalItem(null)}
                  className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingDecline || declineReason.trim().length < 5}
                  className="px-4 py-2 bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold rounded-xl disabled:opacity-50 inline-flex items-center gap-1.5"
                >
                  {isSubmittingDecline && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Xác nhận từ chối
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
