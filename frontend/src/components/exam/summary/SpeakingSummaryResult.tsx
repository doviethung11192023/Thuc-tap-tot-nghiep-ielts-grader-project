"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  GraduationCap,
  Loader2,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { useSpeakingAttemptSummary } from '@/hooks/useSpeakingAttemptSummary';
import { requestPracticeExpertReview } from '@/services/expert';
import { retryAiGrading } from '@/services/student-test-practice';
import { toast } from "sonner";
import {
  CriteriaGrid,
  OverallReport,
  PronunciationEvidence,
  SpeechMetricsPanel,
} from '../speaking/speaking-result-sections';
import { SpeakingTestPromptsPanel } from '../speaking/speaking-prompt-card';
import { DualEvaluationComparisonCard } from './DualEvaluationComparisonCard';

interface SpeakingSummaryResultProps {
  testId?: string;
  attemptId?: string;
  returnUrl?: string;
}

function StatusCard({
  title,
  message,
  spinning = false,
}: {
  title: string;
  message: string;
  spinning?: boolean;
}) {
  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm text-center space-y-2 max-w-xl mx-auto mt-6">
      {spinning && <Loader2 className="w-7 h-7 text-blue-600 mx-auto animate-spin" />}
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}

export const SpeakingSummaryResult: React.FC<SpeakingSummaryResultProps> = ({
  testId,
  attemptId,
  returnUrl,
}) => {
  const { data, error, reload } = useSpeakingAttemptSummary(attemptId);
  const speaking = data?.speaking;
  const isWaitingExpert =
    data?.status === 'waiting_expert' ||
    data?.expert_review_status === 'waiting' ||
    data?.expert_review_status === 'assigned';
  const isExpertOfficial = data?.evaluator_type === 'expert';
  const scored =
    (data?.status === 'scored' || data?.status === 'waiting_expert') && data?.overall_band !== null;
  const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';

  const [requestingExpert, setRequestingExpert] = useState(false);
  const [expertRequested, setExpertRequested] = useState(false);
  const [retryingAi, setRetryingAi] = useState(false);

  const handleRetryAi = async () => {
    if (!attemptId) return;
    try {
      setRetryingAi(true);
      await retryAiGrading(attemptId);
      toast.success('Đã gửi yêu cầu chấm lại bằng AI. Kết quả sẽ tự động cập nhật!');
      reload();
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Không thể kích hoạt chấm lại');
    } finally {
      setRetryingAi(false);
    }
  };

  const handleRequestExpert = async () => {
    if (!attemptId) return;
    try {
      setRequestingExpert(true);
      await requestPracticeExpertReview(attemptId);
      setExpertRequested(true);
      toast.success('Đã gửi yêu cầu Chuyên gia chấm lại thành công (SLA trong 48h làm việc)!');
    } catch (e: any) {
      toast.error(e.response?.data?.detail || 'Lỗi khi gửi yêu cầu');
    } finally {
      setRequestingExpert(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3">
          <Link
            href={returnUrl || '/test-practice'}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            title="Quay lại"
            aria-label="Quay lại"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="text-center">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Báo cáo tổng kết
            </p>
            <h1 className="text-sm sm:text-base font-extrabold text-slate-900">
              Kết quả bài thi Speaking
            </h1>
          </div>
          <Link
            href={returnUrl || '/test-practice'}
            className="px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
          >
            Hoàn thành
          </Link>
        </div>
      </header>

      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {!attemptId && (
          <StatusCard
            title="Không tìm thấy bài làm"
            message="Đường dẫn này không gắn với bài làm nào."
          />
        )}
        {attemptId && !data && (
          <StatusCard title={error ?? 'Đang tải kết quả...'} message="" spinning={!error} />
        )}

        {data && !speaking?.grading_done && (
          <StatusCard
            spinning
            title="Đang chấm bài"
            message="AI đang nghe và phân tích câu trả lời của bạn. Kết quả sẽ tự hiện ở đây."
          />
        )}
        {data?.status === 'no_speech' && (
          <StatusCard
            title="Không phát hiện giọng nói"
            message="Bài này không có câu trả lời nào nghe được nên chưa thể chấm. Hãy kiểm tra micro rồi làm lại."
          />
        )}
        {data?.status === 'grading_failed' && (
          <div className="bg-white rounded-3xl border border-slate-200/90 p-8 shadow-sm text-center space-y-4 max-w-xl mx-auto">
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-800">Chấm bài không thành công</h2>
              <p className="text-sm text-slate-600">
                Hệ thống gặp sự cố tạm thời khi chấm, nhưng toàn bộ file ghi âm của bạn đã được lưu
                an toàn.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRetryAi}
              disabled={retryingAi}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#932120] hover:bg-[#7a1a19] disabled:opacity-60 text-white text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
            >
              {retryingAi ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              <span>{retryingAi ? 'Đang gửi lại...' : 'Chấm lại bằng AI'}</span>
            </button>
          </div>
        )}

        {scored && speaking && data && (
          <>
            {isWaitingExpert && !isExpertOfficial && (
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl p-4 text-center text-xs space-y-1 shadow-2xs">
                <span className="font-bold flex items-center justify-center gap-1.5 text-amber-800">
                  <Clock className="w-4 h-4" /> Bài thi đang trong hàng đợi thẩm định của Chuyên
                  gia (SLA 48h)
                </span>
                <p className="text-[11px] text-amber-700">
                  Điểm số AI hiển thị dưới đây là điểm ước lượng chẩn đoán sơ bộ.
                </p>
              </div>
            )}

            {/* Hero Score Banner */}
            <section className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-xs relative overflow-hidden">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="space-y-3 text-center md:text-left">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                      isExpertOfficial
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-red-50 border-red-200 text-[#932120]'
                    }`}
                  >
                    {isExpertOfficial ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isExpertOfficial
                        ? 'Điểm chính thức đã được Chuyên gia IELTS thẩm định'
                        : isWaitingExpert
                          ? 'Điểm sơ bộ (AI Estimate) — Đang chờ Chuyên gia chấm'
                          : 'Điểm ước lượng của AI (estimate), không phải điểm giám khảo'}
                    </span>
                  </span>

                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    {data.title}
                  </h2>

                  <div className="flex flex-wrap justify-center md:justify-start gap-3 pt-1">
                    <Link
                      href={`/test-practice/speaking/${testId}/detail?attemptId=${attemptId}${returnQuery}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#932120] hover:bg-[#7a1a19] text-white font-bold text-xs sm:text-sm rounded-full shadow-sm transition-colors cursor-pointer"
                    >
                      <span>Xem chi tiết & Audio từng câu</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>

                    {!isWaitingExpert && !isExpertOfficial && (
                      <button
                        type="button"
                        disabled={requestingExpert || expertRequested}
                        onClick={handleRequestExpert}
                        className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-sm transition disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        {requestingExpert ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : expertRequested ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : (
                          <GraduationCap className="w-4 h-4" />
                        )}
                        <span>
                          {expertRequested ? 'Đã gửi Chuyên gia' : 'Xin Chuyên gia chấm lại'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center px-8 py-5 rounded-3xl bg-gradient-to-br from-[#932120] to-[#6a1514] text-white shadow-md min-w-[170px] shrink-0">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-100">
                    Overall Band
                  </span>
                  <span className="text-5xl font-black tracking-tight my-1 tabular-nums">
                    {data.overall_band?.toFixed(1)}
                  </span>
                  <span className="text-[11px] font-semibold text-red-100">Thang điểm 9.0</span>
                </div>
              </div>
              {/* Trần điểm: trả lời thiếu (BR-23), nghe không rõ (BR-24), Part 2 hoặc cả bài quá ngắn (BR-25) */}
              {speaking.coverage?.note && (
                <p className="text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl px-3 py-2 mt-4">
                  {speaking.coverage.note} Hãy trả lời đủ các câu để được chấm đầy đủ.
                </p>
              )}
              {speaking.intelligibility?.note && (
                <p className="text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl px-3 py-2 mt-3">
                  {speaking.intelligibility.note} Hãy nói chậm và rõ từng từ, thu âm nơi yên tĩnh.
                </p>
              )}
              {speaking.length?.note && (
                <p className="text-xs font-semibold text-amber-800 bg-amber-50 rounded-xl px-3 py-2 mt-3">
                  {speaking.length.note}
                </p>
              )}
            </section>

            {/* Bento 2-Column Analytics */}
            <DualEvaluationComparisonCard
              attemptId={attemptId}
              aiBand={data.ai_evaluation?.overall_band}
              expertBand={data.expert_review?.overall_band}
              expertFeedback={data.expert_review?.feedback ?? speaking.feedback}
              expertReviewStatus={data.expert_review_status}
              expertReviewDueAt={data.expert_review_due_at}
            />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 space-y-5">
                <CriteriaGrid criteria={speaking.criteria} />
                <OverallReport report={speaking.overall} fallback={speaking.feedback} />
              </div>

              <div className="lg:col-span-5 space-y-5">
                {speaking.pronunciation && <PronunciationEvidence evidence={speaking.pronunciation} />}
                {speaking.speech_metrics && <SpeechMetricsPanel metrics={speaking.speech_metrics} />}
                <SpeakingTestPromptsPanel sections={data.test_sections} />
              </div>
            </div>
          </>
        )}

        {!scored && data?.test_sections && data.test_sections.length > 0 && (
          <SpeakingTestPromptsPanel sections={data.test_sections} />
        )}
      </main>
    </div>
  );
};
