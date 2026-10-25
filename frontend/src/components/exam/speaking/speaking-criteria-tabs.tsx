"use client";

import React from 'react';
import { Info, AlertCircle } from 'lucide-react';
import { CriteriaSubMetric } from '@/mocks/exam-speaking';

interface SpeakingCriteriaTabsProps {
  criterionKey: 'fc' | 'lr' | 'gra' | 'pr';
  data: {
    score: number;
    band_descriptors: string[];
    sub_metrics: CriteriaSubMetric[];
    frequent_errors?: { count: number; name: string }[];
  };
}

export const SpeakingCriteriaTabs: React.FC<SpeakingCriteriaTabsProps> = ({
  criterionKey,
  data,
}) => {
  const getRatingBadgeClass = (rating: string) => {
    switch (rating) {
      case 'Excellent':
        return 'bg-blue-600 text-white';
      case 'Very Good':
        return 'bg-emerald-600 text-white';
      case 'Good':
        return 'bg-amber-500 text-white';
      default:
        return 'bg-slate-400 text-white';
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start py-4">
      {/* Left Column: Band Descriptors Card */}
      <div className="lg:col-span-5 bg-slate-50/80 rounded-3xl p-6 border border-slate-200/70 space-y-4">
        {/* Score Badge */}
        <div className="inline-block px-4 py-2 rounded-2xl bg-blue-600 text-white font-mono font-black text-2xl shadow-md shadow-blue-500/20">
          {data.score.toFixed(1)}
        </div>

        {/* Band Descriptors */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-800">Band descriptors</h3>

          <div className="space-y-2.5">
            {data.band_descriptors.map((desc, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                <span className="text-slate-400 font-bold shrink-0 mt-0.5">•</span>
                <span>{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Sub-metrics Progress Bars */}
      <div className="lg:col-span-7 space-y-6">
        {data.sub_metrics.map((metric, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <span>{metric.name}</span>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden flex items-center p-0.5 relative">
              {/* 4 segments guide lines */}
              <div className="absolute inset-0 grid grid-cols-4 pointer-events-none">
                <div className="border-r border-white/60"></div>
                <div className="border-r border-white/60"></div>
                <div className="border-r border-white/60"></div>
                <div></div>
              </div>

              {/* Filled Segment */}
              <div
                style={{ width: `${metric.percent}%` }}
                className={`h-full rounded-full flex items-center justify-end px-2 text-[10px] font-bold ${getRatingBadgeClass(
                  metric.rating
                )} transition-all duration-700 shadow-xs`}
              >
                <span>{metric.rating}</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed pt-0.5">
              {metric.feedback}
            </p>
          </div>
        ))}

        {/* Most Frequent Grammar Errors (For GRA tab) */}
        {data.frequent_errors && data.frequent_errors.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700">
              Most frequent grammar errors
            </h4>

            <div className="flex flex-wrap gap-2.5">
              {data.frequent_errors.map((err, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50/70 border border-red-200/60 text-xs text-slate-700 font-medium"
                >
                  <span className="px-1.5 py-0.5 rounded-md bg-red-500 text-white font-bold text-[10px]">
                    {err.count} lần
                  </span>
                  <span>{err.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[11px] text-slate-400 italic pt-2">
          * Các chỉ số trên được đánh giá dựa trên việc so sánh kết quả với các bài có band điểm tương đương
        </p>
      </div>
    </div>
  );
};
