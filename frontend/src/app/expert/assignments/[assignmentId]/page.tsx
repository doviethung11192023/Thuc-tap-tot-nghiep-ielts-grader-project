"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Loader2,
  User as UserIcon,
  Sparkles,
} from "lucide-react";
import {
  getAssignmentWorkspace,
  saveExpertDraft,
  submitExpertReview,
} from "@/services/expert";
import type {
  ExpertWorkspaceData,
  WorkspaceAnnotation,
  CriterionScoreDetail,
} from "@/types";
import WritingAnnotationWorkspace from "@/components/expert/WritingAnnotationWorkspace";
import SpeakingAudioWorkspace from "@/components/expert/SpeakingAudioWorkspace";
import CriterionScoringPanel from "@/components/expert/CriterionScoringPanel";
import {
  ExpertCompletenessChecklist,
  isWorkspaceReviewComplete,
} from "@/components/expert/ExpertCompletenessChecklist";
import { AiAgreementConfirmModal } from "@/components/expert/AiAgreementConfirmModal";
import { extractApiErrorMessage } from "@/lib/api-error";
import { toast } from "sonner";

const SnippetDrawer = dynamic(() => import("@/components/expert/SnippetDrawer"), {
  ssr: false,
  loading: () => null,
});

export default function ExpertWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const assignmentId = params.assignmentId as string;

  const { data, isLoading, isError, error } = useQuery<ExpertWorkspaceData>({
    queryKey: ["expert-workspace", assignmentId],
    queryFn: () => getAssignmentWorkspace(assignmentId),
    staleTime: 60 * 1000,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const hydratedRef = useRef(false);

  // Active tabs
  const [activeTaskTab, setActiveTaskTab] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  // Expert Grading State
  const [overallBand, setOverallBand] = useState<number>(6.5);
  const [criteriaScores, setCriteriaScores] = useState<CriterionScoreDetail[]>([]);
  const [annotations, setAnnotations] = useState<WorkspaceAnnotation[]>([]);
  const [generalFeedback, setGeneralFeedback] = useState("");
  const [changeReason, setChangeReason] = useState("");

  // Snippet Drawer State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerCategory, setDrawerCategory] = useState("ALL");
  const [drawerOnSelect, setDrawerOnSelect] = useState<(text: string) => void>(() => () => {});

  // Confirm Submit Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAiAgreementModal, setShowAiAgreementModal] = useState(false);

  useEffect(() => {
    hydratedRef.current = false;
  }, [assignmentId]);

  useEffect(() => {
    if (!data || hydratedRef.current) return;
    hydratedRef.current = true;

    const initEval = data.expert_draft.evaluation || data.ai_evaluation.evaluation;
    if (initEval?.overall_band !== undefined && initEval?.overall_band !== null) {
      setOverallBand(Number(initEval.overall_band));
    }
    if (initEval?.feedback) {
      setGeneralFeedback(initEval.feedback);
    }

    const initCriteria =
      data.expert_draft.criteria.length > 0
        ? data.expert_draft.criteria
        : data.ai_evaluation.criteria;

    if (initCriteria.length > 0) {
      setCriteriaScores(initCriteria);
    } else {
      const fallbacks: CriterionScoreDetail[] = (data.criteria_definitions || []).map((def) => {
        const isSpeaking = data.attempt.skill === "speaking";
        const firstTask = data.content?.tasks?.[0];
        const firstTaskNo = firstTask?.task_no ?? (firstTask?.task_type === "task1" ? 1 : 2);
        const defaultTaskNo = isSpeaking
          ? 0
          : def.code === "TA"
            ? 1
            : firstTaskNo;
        return {
          criterion_id: def.id,
          code: def.code,
          name: def.name,
          task_no: defaultTaskNo,
          band: 6.0,
          comment: "",
        };
      });
      setCriteriaScores(fallbacks);
    }

    const initAnn =
      data.expert_draft.annotations.length > 0
        ? data.expert_draft.annotations
        : data.ai_evaluation.annotations;
    setAnnotations(initAnn);
    setIsDirty(false);
  }, [data]);

  const buildPayload = () => ({
    overall_band: overallBand,
    criterion_scores: criteriaScores.map((c) => ({
      criterion_id: c.criterion_id,
      task_no: c.task_no,
      skill: data?.attempt.skill || "writing",
      band: c.band,
      comment: c.comment,
    })),
    annotations,
    feedback: generalFeedback,
    change_reason: changeReason.trim() || undefined,
  });

  // Real debounced auto-save
  useEffect(() => {
    if (!data || !isDirty || data.assignment.ended_at) return;
    const timer = setTimeout(async () => {
      try {
        setIsSavingDraft(true);
        await saveExpertDraft(assignmentId, buildPayload());
        setIsDirty(false);
        setLastSavedAt(
          new Date().toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        );
        void queryClient.invalidateQueries({ queryKey: ["expert-workspace", assignmentId] });
      } catch (err) {
        console.warn("Auto-save draft failed:", err);
      } finally {
        setIsSavingDraft(false);
      }
    }, 2200);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, overallBand, criteriaScores, annotations, generalFeedback]);

  const handleSaveAndExit = async () => {
    if (!data) {
      router.push("/expert/assignments");
      return;
    }
    try {
      setIsSavingDraft(true);
      await saveExpertDraft(assignmentId, buildPayload());
      await queryClient.invalidateQueries({ queryKey: ["expert-workspace", assignmentId] });
      await queryClient.invalidateQueries({ queryKey: ["expert-assignments"] });
      toast.success("Đã lưu bản nháp bài chấm!");
      router.push("/expert/assignments");
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Không thể lưu bản nháp"));
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleUpdateCriterion = (idx: number, updated: CriterionScoreDetail) => {
    const copy = [...criteriaScores];
    copy[idx] = updated;
    setCriteriaScores(copy);
    setIsDirty(true);
  };

  const handleOpenDrawer = (category: string, callback: (text: string) => void) => {
    setDrawerCategory(category);
    setDrawerOnSelect(() => callback);
    setIsDrawerOpen(true);
  };

  const handleSubmitFinal = async (aiAgreement?: { confirmed: boolean; studyTipNote: string }) => {
    if (!data) return;

    const aiBand = data.ai_evaluation.evaluation?.overall_band;
    const minReason = data.completeness_rules?.min_change_reason_chars ?? 15;
    if (aiBand !== undefined && aiBand !== null) {
      const dev = Math.abs(overallBand - Number(aiBand));
      if (dev >= 1.0 && changeReason.trim().length < minReason) {
        toast.error(`Điểm số lệch từ 1.0 band trở lên so với AI. Vui lòng nhập lý do giải trình tối thiểu ${minReason} ký tự.`);
        setShowConfirmModal(false);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await submitExpertReview(assignmentId, {
        ...buildPayload(),
        ...(aiAgreement
          ? {
              ai_agreement_confirmed: aiAgreement.confirmed,
              study_tip_note: aiAgreement.studyTipNote,
            }
          : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ["expert-assignments"] });
      await queryClient.invalidateQueries({ queryKey: ["expert-workspace", assignmentId] });
      toast.success("Ký duyệt và trả kết quả chính thức thành công!");
      setShowConfirmModal(false);
      setShowAiAgreementModal(false);
      router.push("/expert/assignments");
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Lỗi khi nộp kết quả chấm bài"));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#932120]" />
        <span className="text-sm font-medium text-zinc-500">Đang khởi tạo không gian chấm bài...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-lg mx-auto my-12 p-6 bg-white rounded-2xl border border-zinc-200 text-center space-y-3">
        <p className="text-sm font-bold text-red-700">
          {extractApiErrorMessage(error, "Không thể tải dữ liệu bài thi")}
        </p>
        <Link
          href="/expert/assignments"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-xs font-bold text-zinc-800"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  if (!data) return null;

  const isSpeaking = data.attempt.skill === "speaking";
  const tasks = data.content.tasks || [];
  const questions = data.content.questions || [];
  const aiEval = data.ai_evaluation.evaluation;
  const hasValidAi = Boolean(aiEval && aiEval.status !== "failed" && aiEval.overall_band !== null && aiEval.overall_band !== undefined);
  const aiCrit = data.ai_evaluation.criteria || [];
  const aiAnn = data.ai_evaluation.annotations || [];
  const annSig = (a: WorkspaceAnnotation) =>
    `${a.category || ""}|${(a.original_text || "").trim()}|${(a.corrected_text || "").trim()}|${(a.explanation || "").trim()}|${a.essay_id || a.response_id || ""}`;
  const isUnchangedFromAi = Boolean(
    hasValidAi &&
      aiEval &&
      aiCrit.length > 0 &&
      Math.abs(overallBand - Number(aiEval.overall_band)) < 0.01 &&
      generalFeedback.trim() === (aiEval.feedback || "").trim() &&
      criteriaScores.length === aiCrit.length &&
      criteriaScores.every((cs) => {
        const match = aiCrit.find((ac) => ac.criterion_id === cs.criterion_id && (ac.task_no || 1) === (cs.task_no || 1));
        return Boolean(match && Math.abs(cs.band - match.band) < 0.01 && (cs.comment || "").trim() === (match.comment || "").trim());
      }) &&
      annotations.length === aiAnn.length &&
      annotations.every((a) => aiAnn.some((b) => annSig(a) === annSig(b))),
  );
  const reviewComplete = isWorkspaceReviewComplete(
    data.attempt.skill,
    criteriaScores,
    annotations,
    generalFeedback,
    data.completeness_rules,
    overallBand,
    aiEval?.overall_band,
    changeReason,
  );

  return (
    <div className="space-y-5 pb-6">
      {/* Top Breadcrumb & Attempt Info Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/expert/assignments"
            className="p-2 text-zinc-500 hover:text-zinc-900 rounded-xl hover:bg-zinc-100 transition-colors"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  isSpeaking ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                }`}
              >
                {isSpeaking ? "Speaking" : "Writing"}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  data.attempt.mode === "mock" ? "bg-rose-100 text-[#932120]" : "bg-zinc-100 text-zinc-700"
                }`}
              >
                {data.attempt.mode === "mock" ? "Mock Test (Thi thử)" : "Practice (Luyện tập)"}
              </span>
              <span className="text-xs text-zinc-400 font-mono">#{data.attempt.id.slice(0, 8)}</span>
            </div>
            <h1 className="text-base font-bold text-zinc-900 mt-0.5">
              {data.attempt.tests?.title || "Bài kiểm tra"}
            </h1>
          </div>
        </div>

        {/* Student Target Band Pill */}
        <div className="flex items-center gap-3">
          <div className="text-xs p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-zinc-400" />
            <div>
              <span className="text-zinc-500 text-[10px] block">Mục tiêu học viên:</span>
              <span className="font-bold text-zinc-900">
                Overall Band {data.learner_target.target_overall || "—"} (
                {isSpeaking
                  ? `Speaking: ${data.learner_target.target_speaking || "—"}`
                  : `Writing: ${data.learner_target.target_writing || "—"}`}
                )
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Split-View Layout (60 / 40) - Natural page flow, NO overlapping sticky! */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 cols): Student Content & Annotation Workspace */}
        <div className="lg:col-span-7 min-w-0">
          {!isSpeaking ? (
            <WritingAnnotationWorkspace
              tasks={tasks}
              annotations={annotations}
              onChangeAnnotations={(updated) => {
                setAnnotations(updated);
                setIsDirty(true);
              }}
              activeTaskTab={activeTaskTab}
              setActiveTaskTab={setActiveTaskTab}
            />
          ) : (
            <SpeakingAudioWorkspace
              questions={questions}
              annotations={annotations}
              onChangeAnnotations={(updated) => {
                setAnnotations(updated);
                setIsDirty(true);
              }}
              activeQuestionIdx={activeQuestionIdx}
              setActiveQuestionIdx={setActiveQuestionIdx}
            />
          )}
        </div>

        {/* Right Column (5 cols): Sticky 4 Cambridge Criteria Scoring Panel */}
        <div className="lg:col-span-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-145px)] lg:overflow-y-auto rounded-2xl">
          <CriterionScoringPanel
            skill={data.attempt.skill}
            activeTaskNo={!isSpeaking ? tasks[activeTaskTab]?.task_no ?? activeTaskTab + 1 : undefined}
            criteriaList={criteriaScores}
            onChangeCriterion={handleUpdateCriterion}
            overallBand={overallBand}
            onChangeOverallBand={(b) => {
              setOverallBand(b);
              setIsDirty(true);
            }}
            aiOverallBand={data.ai_evaluation.evaluation?.overall_band}
            changeReason={changeReason}
            onChangeReason={(r) => {
              setChangeReason(r);
              setIsDirty(true);
            }}
            onOpenSnippetDrawer={handleOpenDrawer}
          />
          <ExpertCompletenessChecklist
            skill={data.attempt.skill}
            overallBand={overallBand}
            aiOverallBand={aiEval?.overall_band}
            changeReason={changeReason}
            criteriaScores={criteriaScores}
            annotations={annotations}
            generalFeedback={generalFeedback}
            onChangeFeedback={(val) => {
              setGeneralFeedback(val);
              setIsDirty(true);
            }}
            rules={data.completeness_rules}
          />
        </div>
      </div>

      {/* Clean Sticky Bottom Action Bar */}
      <div className="sticky bottom-3 z-30 bg-white/95 backdrop-blur-md border border-zinc-200 p-4 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-600">
          {isSavingDraft ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#932120]" />
              <span>Đang lưu bản nháp...</span>
            </>
          ) : isDirty ? (
            <>
              <Save className="w-4 h-4 text-amber-600" />
              <span>Có thay đổi chưa lưu (sẽ tự động lưu sau giây lát)...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>
                {lastSavedAt
                  ? `Đã lưu bản nháp lúc ${lastSavedAt}`
                  : "Bản nháp đã đồng bộ. Sẵn sàng hoàn tất bài chấm."}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isSavingDraft}
            onClick={() => void handleSaveAndExit()}
            className="px-4 py-2.5 text-xs font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Lưu &amp; Thoát
          </button>

          <button
            type="button"
            disabled={!reviewComplete}
            onClick={() => (isUnchangedFromAi ? setShowAiAgreementModal(true) : setShowConfirmModal(true))}
            title={reviewComplete ? "Ký duyệt & Công bố kết quả" : "Hoàn tất đầy đủ các mục kiểm tra trước khi nộp"}
            className="px-6 py-2.5 bg-[#932120] hover:bg-[#7a1a19] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-4 h-4" /> Ký Duyệt &amp; Trả Kết Quả Chính Thức
          </button>
        </div>
      </div>

      {/* Snippet Drawer */}
      <SnippetDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        defaultCategory={drawerCategory}
        skill={data.attempt.skill}
        onSelectSnippet={drawerOnSelect}
      />

      <AiAgreementConfirmModal
        open={showAiAgreementModal}
        overallBand={overallBand}
        minStudyTipChars={data.completeness_rules?.min_study_tip_chars ?? 30}
        submitting={isSubmitting}
        onClose={() => setShowAiAgreementModal(false)}
        onConfirm={(studyTipNote) => void handleSubmitFinal({ confirmed: true, studyTipNote })}
      />

      {/* Confirm Submission Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-submit-title"
        >
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-[#932120]">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 id="confirm-submit-title" className="text-base font-bold text-zinc-900">Xác nhận công bố kết quả</h3>
                <p className="text-xs text-zinc-500">Kết quả này sẽ trở thành điểm số chính thức (Official Band)</p>
              </div>
            </div>

            <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-500">Overall Band chính thức:</span>
                <span className="font-extrabold text-[#932120] text-sm font-mono">{overallBand.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Số lượng lỗi đã đánh dấu:</span>
                <span className="font-bold text-zinc-800">{annotations.length} lỗi</span>
              </div>
              {changeReason && (
                <div className="pt-2 border-t border-zinc-200">
                  <span className="text-zinc-500 block">Lý do điều chỉnh lệch AI:</span>
                  <span className="text-zinc-800 font-medium italic">&quot;{changeReason}&quot;</span>
                </div>
              )}
            </div>

            <p className="text-xs text-zinc-500">
              Sau khi công bố, điểm số sẽ ngay lập tức được cập nhật về Hồ sơ học tập và Bảng điều khiển của thí sinh (Realtime).
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer"
              >
                Kiểm tra lại
              </button>
              <button
                type="button"
                onClick={() => void handleSubmitFinal()}
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#932120] hover:bg-[#7a1a19] text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Công bố chính thức
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
