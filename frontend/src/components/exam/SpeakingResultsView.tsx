"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getAttemptDetail } from '@/services/student-test-practice';
import { SpeakingRecordedAudio } from './speaking/speaking-recorded-audio';
import { SpeakingAnswerFeedback } from './speaking/speaking-answer-feedback';
import type { SpeakingEdit, SpeakingPronunciationHint, SpeakingStrength } from './speaking/speaking-feedback-types';

interface SpeakingAnswerDetail {
  response_id: string;
  part: number;
  question: string;
  transcript: string | null;
  audio_url: string | null;
  edits?: SpeakingEdit[];
  strengths?: SpeakingStrength[];
  pronunciation_hints?: SpeakingPronunciationHint[];
}

interface PartFeedbackAnswer {
  question: string;
  relevance?: string;
  development?: string;
  strengths?: { point: string; evidence: string }[];
  issues?: { point: string; evidence: string; recommendation?: string }[];
  useful_language?: string[];
  upgraded_answer?: string;
}

interface PartFeedback {
  part_summary?: string;
  answers?: PartFeedbackAnswer[];
}

interface SpeakingDetail {
  title: string;
  speaking?: { pronunciation?: { phoneme_usable?: boolean } | null };
  answers: SpeakingAnswerDetail[];
  parts: Record<string, PartFeedback | null> | null;
}

interface SpeakingResultsViewProps {
  attemptId?: string;
  backUrl: string;
}

function FeedbackBlock({ feedback }: { feedback: PartFeedbackAnswer }) {
  return (
    <div className="space-y-2 text-xs text-slate-700">
      {feedback.strengths?.map((item) => (
        <p key={item.point}><span className="font-bold text-emerald-700">Điểm tốt:</span> {item.point} <em>“{item.evidence}”</em></p>
      ))}
      {feedback.issues?.map((item) => (
        <p key={item.point}><span className="font-bold text-amber-700">Cần cải thiện:</span> {item.point} {item.recommendation}</p>
      ))}
      {!!feedback.useful_language?.length && (
        <p><span className="font-bold">Cụm từ nên dùng:</span> {feedback.useful_language.join(', ')}</p>
      )}
    </div>
  );
}

export const SpeakingResultsView: React.FC<SpeakingResultsViewProps> = ({ attemptId, backUrl }) => {
  const [detail, setDetail] = useState<SpeakingDetail | null>(null);
  const [failed, setFailed] = useState(!attemptId);

  useEffect(() => {
    if (!attemptId) return;
    getAttemptDetail(attemptId).then(setDetail).catch(() => setFailed(true));
  }, [attemptId]);

  const partNumbers = [...new Set(detail?.answers.map((answer) => answer.part) ?? [])];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3">
        <Link href={backUrl} className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200" title="Quay lại">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-sm font-bold text-slate-800 truncate">{detail?.title ?? 'Chi tiết bài làm'}</h1>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-6">
        {failed && <p className="text-sm text-slate-600 text-center pt-10">Không tải được chi tiết bài làm.</p>}
        {!failed && !detail && <p className="text-sm text-slate-500 text-center pt-10">Đang tải...</p>}
        {detail?.speaking?.pronunciation?.phoneme_usable === false && (
          <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
            Bản ghi có vẻ bị méo hoặc phát qua loa, nên hệ thống không chỉ ra từ phát âm chưa rõ. Hãy ghi âm trực tiếp, gần micro để nhận gợi ý từng từ.
          </p>
        )}

        {partNumbers.map((part) => {
          const partFeedback = detail?.parts?.[`part${part}`];
          const answers = detail?.answers.filter((answer) => answer.part === part) ?? [];
          return (
            <section key={part} className="space-y-3">
              <h2 className="text-base font-extrabold text-slate-800">Part {part}</h2>
              {partFeedback?.part_summary && <p className="text-sm text-slate-600">{partFeedback.part_summary}</p>}
              {answers.map((answer, index) => {
                const feedback = partFeedback?.answers?.[index];
                return (
                  <article key={answer.response_id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-800">{answer.question}</h3>
                    {answer.audio_url
                      ? <SpeakingRecordedAudio src={answer.audio_url} className="w-full h-10" />
                      : <p className="text-xs text-slate-500">Audio không còn được lưu.</p>}
                    <SpeakingAnswerFeedback
                      transcript={answer.transcript}
                      audioUrl={answer.audio_url}
                      edits={answer.edits ?? []}
                      strengths={answer.strengths ?? []}
                      hints={answer.pronunciation_hints ?? []}
                      upgradedAnswer={feedback?.upgraded_answer}
                    />
                    {feedback && <FeedbackBlock feedback={feedback} />}
                  </article>
                );
              })}
            </section>
          );
        })}
      </main>
    </div>
  );
};
