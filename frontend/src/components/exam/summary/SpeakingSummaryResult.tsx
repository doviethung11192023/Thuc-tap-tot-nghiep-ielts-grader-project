"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useSpeakingAttemptSummary } from '@/hooks/useSpeakingAttemptSummary';
import {
  CriteriaGrid,
  OverallReport,
  PronunciationEvidence,
  SpeechMetricsPanel,
} from '../speaking/speaking-result-sections';

interface SpeakingSummaryResultProps {
  testId?: string;
  attemptId?: string;
  returnUrl?: string;
}

function StatusCard({ title, message, spinning = false }: { title: string; message: string; spinning?: boolean }) {
  return (
    <div className="bg-white rounded-3xl p-8 shadow-xl text-center space-y-2">
      {spinning && <Loader2 className="w-7 h-7 text-blue-600 mx-auto animate-spin" />}
      <h2 className="text-lg font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-600">{message}</p>
    </div>
  );
}

export const SpeakingSummaryResult: React.FC<SpeakingSummaryResultProps> = ({ testId, attemptId, returnUrl }) => {
  const { data, error } = useSpeakingAttemptSummary(attemptId);
  const speaking = data?.speaking;
  const scored = data?.status === 'scored' && data.overall_band !== null;
  const returnQuery = returnUrl ? `&returnUrl=${encodeURIComponent(returnUrl)}` : '';

  return (
    <div className="min-h-screen bg-[#0071f9] text-slate-800 pb-16">
      <header className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center justify-between text-white">
        <Link href={returnUrl || '/test-practice'} className="p-2 rounded-xl bg-white/10 hover:bg-white/20" title="Quay lại">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-base sm:text-lg font-extrabold">Kết quả</h1>
        <Link href={returnUrl || '/test-practice'} className="px-4 py-1.5 rounded-full bg-white/15 hover:bg-white/25 font-bold text-xs">
          Hoàn thành
        </Link>
      </header>

      <main className="w-full max-w-4xl mx-auto px-4 space-y-4">
        {!attemptId && <StatusCard title="Không tìm thấy bài làm" message="Đường dẫn này không gắn với bài làm nào." />}
        {attemptId && !data && <StatusCard title={error ?? 'Đang tải kết quả...'} message="" spinning={!error} />}

        {data && !speaking?.grading_done && (
          <StatusCard spinning title="Đang chấm bài" message="AI đang nghe và phân tích câu trả lời của bạn. Kết quả sẽ tự hiện ở đây." />
        )}
        {data?.status === 'no_speech' && (
          <StatusCard title="Không phát hiện giọng nói" message="Bài này không có câu trả lời nào nghe được nên chưa thể chấm. Hãy kiểm tra micro rồi làm lại." />
        )}
        {data?.status === 'grading_failed' && (
          <StatusCard title="Chấm bài không thành công" message="Hệ thống gặp lỗi khi chấm, nên chưa có điểm. Bài của bạn vẫn được lưu; quản trị viên có thể chạy lại." />
        )}

        {scored && speaking && data && (
          <>
            <section className="bg-white rounded-3xl p-6 shadow-xl text-center space-y-1">
              <p className="text-xs text-slate-500">{data.title}</p>
              <p className="text-5xl font-black text-blue-700">{data.overall_band?.toFixed(1)}</p>
              <p className="text-xs font-semibold text-slate-600">Điểm ước lượng của AI (estimate), không phải điểm giám khảo</p>
            </section>

            <CriteriaGrid criteria={speaking.criteria} />
            {speaking.pronunciation && <PronunciationEvidence evidence={speaking.pronunciation} />}
            {speaking.speech_metrics && <SpeechMetricsPanel metrics={speaking.speech_metrics} />}
            <OverallReport report={speaking.overall} fallback={speaking.feedback} />

            <div className="flex justify-center pt-2">
              <Link
                href={`/test-practice/speaking/${testId}/detail?attemptId=${attemptId}${returnQuery}`}
                className="px-8 py-3.5 bg-white hover:bg-blue-50 text-blue-600 font-bold text-xs sm:text-sm rounded-full shadow-lg border border-blue-200"
              >
                Xem kết quả chi tiết từng câu
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
