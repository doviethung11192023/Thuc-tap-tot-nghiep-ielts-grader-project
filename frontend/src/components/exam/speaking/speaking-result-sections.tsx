"use client";

import React from 'react';
import type {
  SpeakingCriterionScore,
  SpeakingOverallReport,
  SpeakingPronunciationEvidence,
} from '@/hooks/useSpeakingAttemptSummary';

const CRITERION_LABELS: Record<string, string> = {
  FC: 'Fluency and Coherence',
  LR: 'Lexical Resource',
  GRA: 'Grammatical Range and Accuracy',
  P: 'Pronunciation',
};

const RELIABILITY_NOTES: Record<string, string> = {
  too_few_words: 'bài nói quá ngắn',
  noisy_recording: 'bản ghi nhiều tạp âm',
  clipped_recording: 'bản ghi bị rè do micro quá to',
  channels_disagree: 'âm thanh có vẻ bị méo hoặc phát qua loa',
};

const METRICS: { key: string; label: string; unit: string }[] = [
  { key: 'words_per_minute', label: 'Tốc độ nói', unit: 'từ/phút' },
  { key: 'articulation_rate', label: 'Tốc độ phát âm', unit: 'âm tiết/giây' },
  { key: 'pause_ratio', label: 'Tỉ lệ ngắt quãng', unit: '' },
  { key: 'long_pause_count', label: 'Khoảng ngừng dài', unit: 'lần' },
  { key: 'mean_run_syllables', label: 'Độ dài mỗi cụm nói', unit: 'âm tiết' },
  { key: 'filler_count', label: 'Từ đệm', unit: 'lần' },
  { key: 'pitch_range_semitones', label: 'Biên độ ngữ điệu', unit: 'nửa cung' },
];

export function CriteriaGrid({ criteria }: { criteria: SpeakingCriterionScore[] }) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
      {criteria.map((item) => {
        const pct = Math.min(100, Math.max(0, (item.band / 9) * 100));
        return (
          <div
            key={item.code}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 space-y-2.5 shadow-2xs"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#932120]">
                  {item.code}
                </span>
                <h3 className="text-sm font-bold text-slate-800">
                  {CRITERION_LABELS[item.code] ?? item.name}
                </h3>
              </div>
              <span className="px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-lg font-black text-[#932120] tabular-nums shrink-0">
                {item.band.toFixed(1)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#932120] to-[#b83230] transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            {item.comment && (
              <p className="text-xs text-slate-600 leading-relaxed">{item.comment}</p>
            )}
          </div>
        );
      })}
    </section>
  );
}

export function PronunciationEvidence({ evidence }: { evidence: SpeakingPronunciationEvidence }) {
  const notes = evidence.reliability_notes.map((note) => RELIABILITY_NOTES[note] ?? note);
  const phonemeUsable = evidence.phoneme_usable !== false;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <h2 className="text-sm font-bold text-slate-800">Bằng chứng phát âm từ audio</h2>
      <p className="text-xs text-slate-500">
        Điểm Pronunciation chỉ là ước lượng, độ tin cậy thấp: hệ thống dựa trên mức máy nhận dạng được lời bạn nói và ngữ điệu, chưa chấm được từng âm. Ngưỡng quy đổi đang ở mức tạm thời.
      </p>
      {!evidence.reliable && (
        <p className="text-xs text-amber-800 bg-amber-50 rounded-xl px-3 py-2">
          Bản ghi chưa đủ tốt ({notes.join(', ')}), nên điểm được giới hạn ở mức 6.0. Hãy nói trực tiếp, gần micro, không mở loa khi ghi âm.
        </p>
      )}
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {evidence.word_confidence !== undefined && (
          <Stat label="Độ rõ khi nhận dạng" value={`${Math.round(evidence.word_confidence * 100)}%`} />
        )}
        {phonemeUsable && (
          <>
            <Stat label="Âm vị khớp" value={`${Math.round(evidence.phoneme_accuracy * 100)}%`} />
            <Stat label="Mất phụ âm cuối" value={String(evidence.final_consonant_deletions)} />
            <Stat label="Lỗi âm th" value={String(evidence.th_substitutions)} />
          </>
        )}
      </dl>
      {evidence.words_possibly_mispronounced.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-slate-700">Từ có thể phát âm chưa rõ</h3>
          <div className="flex flex-wrap gap-1.5">
            {Object.values(
              evidence.words_possibly_mispronounced.reduce<Record<string, { word: string; count: number }>>((acc, item) => {
                const key = item.word.trim().toLowerCase();
                if (!key) return acc;
                if (acc[key]) {
                  acc[key].count += 1;
                } else {
                  acc[key] = { word: item.word, count: 1 };
                }
                return acc;
              }, {})
            ).map((entry, idx) => (
              <span key={`${entry.word}-${idx}`} className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-slate-700">
                {entry.word}{entry.count > 1 ? ` ×${entry.count}` : ''}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3">
      <dd className="text-base font-black text-slate-800">{value}</dd>
      <dt className="text-[11px] text-slate-500">{label}</dt>
    </div>
  );
}

export function SpeechMetricsPanel({ metrics }: { metrics: Record<string, number> }) {
  const rows = METRICS.filter((metric) => metrics[metric.key] !== undefined);
  if (rows.length === 0) return null;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
      <h2 className="text-sm font-bold text-slate-800">Số đo độ trôi chảy</h2>
      <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        {rows.map((metric) => {
          const raw = metrics[metric.key];
          const formatted =
            metric.key === 'pause_ratio'
              ? `${Math.round(raw * 100)}%`
              : `${Number.isInteger(raw) ? raw : raw.toFixed(1)}${metric.unit ? ` ${metric.unit}` : ''}`;
          return (
            <Stat
              key={metric.key}
              label={metric.label}
              value={formatted}
            />
          );
        })}
      </dl>
    </section>
  );
}

export function OverallReport({ report, fallback }: { report: SpeakingOverallReport | null; fallback: string | null }) {
  const summary = report?.overall_summary ?? fallback;
  if (!summary && !report?.priority_actions?.length) return null;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      {summary && <p className="text-sm text-slate-700 leading-relaxed">{summary}</p>}
      {!!report?.priority_actions?.length && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-800">Ưu tiên cải thiện</h2>
          {report.priority_actions.map((action) => (
            <div key={action.focus} className="bg-slate-50 rounded-xl p-3 text-xs text-slate-700 space-y-0.5">
              <p className="font-bold text-slate-800">{action.focus}</p>
              <p>{action.why}</p>
              <p className="text-blue-700">{action.practice_activity}</p>
            </div>
          ))}
        </div>
      )}
      {!!report?.seven_day_plan?.length && (
        <div className="space-y-1.5">
          <h2 className="text-sm font-bold text-slate-800">Kế hoạch 7 ngày</h2>
          <ol className="space-y-1 text-xs text-slate-700">
            {report.seven_day_plan.map((item) => (
              <li key={item.day}><strong>Ngày {item.day}:</strong> {item.task}</li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
