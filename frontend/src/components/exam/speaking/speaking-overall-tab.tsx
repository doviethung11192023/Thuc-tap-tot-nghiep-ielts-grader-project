"use client";

import React from 'react';
import { Sparkles, ArrowRight, Lightbulb } from 'lucide-react';
import { SpeakingSummaryDataset } from '@/mocks/exam-speaking';
import { SpeakingRadarChart } from './speaking-radar-chart';

interface SpeakingOverallTabProps {
  summary: SpeakingSummaryDataset;
  onViewDetail: () => void;
}

export const SpeakingOverallTab: React.FC<SpeakingOverallTabProps> = ({
  summary,
  onViewDetail,
}) => {
  const radarData = [
    { label: 'Overall', score: summary.overall_band },
    { label: 'Fluency & Coherence', score: summary.criteria_scores.fc },
    { label: 'Lexical Resource', score: summary.criteria_scores.lr },
    { label: 'Grammar Accuracy', score: summary.criteria_scores.gra },
    { label: 'Pronunciation', score: summary.criteria_scores.pr },
  ];

  const feedback = summary.overall_feedback;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
      {/* Left Column: Radar Chart */}
      <div className="lg:col-span-5 flex flex-col items-center justify-center p-2">
        <SpeakingRadarChart data={radarData} />
      </div>

      {/* Right Column: Feedback & Action Plan */}
      <div className="lg:col-span-7 space-y-5">
        {/* Congratulation & Summary paragraph */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <span>✨</span>
            <span>Chúc mừng bạn đã hoàn thành câu trả lời!!</span>
          </div>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Ưu điểm lớn nhất trong bài của bạn là{' '}
            <strong className="text-blue-600 underline font-semibold">
              {feedback.main_strength}
            </strong>{' '}
            với ảnh hưởng tích cực lên tiêu chí{' '}
            <strong className="text-slate-800 font-semibold">
              {feedback.strength_criterion}
            </strong>
            . Tuy nhiên, bạn còn gặp vấn đề với{' '}
            <strong className="text-blue-600 underline font-semibold">
              {feedback.main_weakness_1}
            </strong>{' '}
            và{' '}
            <strong className="text-blue-600 underline font-semibold">
              {feedback.main_weakness_2}
            </strong>
            . Hai yếu tố này kéo điểm tiêu chí{' '}
            <strong className="text-slate-800 font-semibold">
              {feedback.weakness_criterion_1}
            </strong>{' '}
            và{' '}
            <strong className="text-slate-800 font-semibold">
              {feedback.weakness_criterion_2}
            </strong>{' '}
            của bạn xuống. Bạn có thể xem phần phân tích chi tiết câu trả lời của bạn cho từng câu hỏi ở màn tiếp theo. Để cải thiện ngay điểm số, bạn hãy thực hiện action plan - kế hoạch hành động ngay dưới đây nhé.
          </p>
        </div>

        {/* Action Plan Card (Golden Yellow Border) */}
        <div className="bg-[#fffbeb] rounded-3xl border-2 border-[#f59e0b] p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-900">
            <span className="text-amber-500">✨</span>
            <span>Action Plan</span>
          </div>

          <p className="text-xs text-amber-950 font-medium leading-relaxed">
            Bạn có thể tích cực cải thiện điểm số ngay từ hôm nay nhờ giải quyết những vấn đề lớn nhất liên quan tới phát âm từ đơn lẻ và từ vựng theo chủ điểm:
          </p>

          <div className="space-y-2.5 pt-1">
            {feedback.action_plans.map((ap, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
                <span className="text-amber-600 font-bold shrink-0 mt-0.5">•</span>
                <span>{ap}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
