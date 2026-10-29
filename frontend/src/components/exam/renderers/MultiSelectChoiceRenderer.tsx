"use client";

import React from 'react';
import { BaseRendererProps, ReviewEvidenceAccordion } from './shared';
import { Check, X } from 'lucide-react';

export const MultiSelectChoiceRenderer: React.FC<BaseRendererProps> = ({
  group,
  mode,
  userAnswers,
  onAnswerChange,
  onSelectEvidence,
}) => {
  const isReview = mode === 'review';
  const qList = group.questions || [];
  const qNumbers = qList.map((q) => q.question_number);
  
  // Detect max selectable choices (e.g. Choose TWO -> 2, Choose THREE -> 3)
  const instrLower = (group.instruction || '').toLowerCase();
  let maxSelect = qNumbers.length > 1 ? qNumbers.length : 2;
  if (instrLower.includes('three') || instrLower.includes(' 3 ')) maxSelect = 3;
  else if (instrLower.includes('two') || instrLower.includes(' 2 ')) maxSelect = 2;
  else if (instrLower.includes('four') || instrLower.includes(' 4 ')) maxSelect = 4;

  // Options pool
  const options = group.options_pool && group.options_pool.length > 0
    ? group.options_pool
    : (qList[0]?.options_pool || []);

  // Gather currently selected keys
  let selectedKeys: string[] = [];
  if (qNumbers.length > 1) {
    selectedKeys = qNumbers
      .map((num) => String(userAnswers[num] || '').trim().toUpperCase())
      .filter(Boolean);
  } else if (qNumbers.length === 1) {
    const val = userAnswers[qNumbers[0]];
    if (Array.isArray(val)) {
      selectedKeys = val.map((v) => String(v).trim().toUpperCase());
    } else if (typeof val === 'string' && val.trim()) {
      selectedKeys = val.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    }
  }

  // Gather correct answers across all questions in the group
  const allCorrectAnswers: string[] = Array.from(
    new Set(
      qList.flatMap((q) => (q.correct_answers || []).map((a) => a.trim().toUpperCase()))
    )
  );

  const handleToggle = (optKey: string) => {
    if (isReview || !onAnswerChange) return;
    const upperKey = optKey.trim().toUpperCase();
    const isAlreadySelected = selectedKeys.includes(upperKey);

    let nextKeys: string[];
    if (isAlreadySelected) {
      nextKeys = selectedKeys.filter((k) => k !== upperKey);
    } else {
      if (selectedKeys.length >= maxSelect) {
        // Replace oldest or cap
        nextKeys = [...selectedKeys.slice(1), upperKey];
      } else {
        nextKeys = [...selectedKeys, upperKey];
      }
    }

    if (qNumbers.length > 1) {
      qNumbers.forEach((num, idx) => {
        onAnswerChange(num, nextKeys[idx] || '');
      });
    } else if (qNumbers.length === 1) {
      onAnswerChange(qNumbers[0], nextKeys);
    }
  };

  const groupPrompt = qList[0]?.prompt || '';

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/70">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2.5 py-1 bg-white border border-zinc-300 rounded-md text-xs font-bold text-zinc-700 shadow-2xs">
            Câu {qNumbers.join(' & ')}
          </span>
          <span className="text-xs font-semibold text-[#932120] bg-red-50 px-2 py-0.5 rounded border border-red-100">
            Chọn {maxSelect} đáp án (Đã chọn: {selectedKeys.length}/{maxSelect})
          </span>
        </div>
        {groupPrompt && <p className="text-sm font-medium text-zinc-900 mt-2">{groupPrompt}</p>}
      </div>

      {/* Options Checkboxes */}
      <div className="space-y-2.5">
        {options.map((opt) => {
          const optKey = opt.key.trim().toUpperCase();
          const isSelected = selectedKeys.includes(optKey);
          const isCorrect = allCorrectAnswers.includes(optKey);

          let itemStyle = 'flex items-center gap-3 p-3.5 rounded-xl border transition-all ';
          let boxStyle = 'w-5 h-5 rounded flex items-center justify-center text-xs font-bold shrink-0 transition-colors ';

          if (isReview) {
            if (isCorrect) {
              itemStyle += 'border-emerald-400 bg-emerald-50/40 text-emerald-950 font-medium';
              boxStyle += 'bg-emerald-600 text-white border-emerald-600';
            } else if (isSelected && !isCorrect) {
              itemStyle += 'border-red-400 bg-red-50/40 text-red-950 line-through';
              boxStyle += 'bg-red-600 text-white border-red-600';
            } else {
              itemStyle += 'border-zinc-200 bg-white opacity-50';
              boxStyle += 'border-zinc-300 bg-zinc-100 text-zinc-400';
            }
          } else {
            if (isSelected) {
              itemStyle += 'border-[#932120] bg-red-50/30 text-zinc-900 shadow-2xs cursor-pointer';
              boxStyle += 'bg-[#932120] text-white border-[#932120]';
            } else {
              itemStyle += 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/60 cursor-pointer';
              boxStyle += 'border-zinc-300 bg-white text-transparent';
            }
          }

          return (
            <div
              key={opt.key}
              onClick={() => handleToggle(opt.key)}
              className={itemStyle}
            >
              <div className={`border ${boxStyle}`}>
                {isReview ? (
                  isCorrect ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : isSelected ? <X className="w-3.5 h-3.5 stroke-[3]" /> : null
                ) : (
                  isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />
                )}
              </div>
              <div className="text-sm flex-1">
                <span className="font-bold mr-2 text-zinc-900">{opt.key}.</span>
                <span className="text-zinc-800">{opt.text}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Review details */}
      {isReview && (
        <div className="mt-4 pt-3 border-t border-zinc-200 space-y-2">
          <div className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 inline-block">
            Đáp án đúng: {allCorrectAnswers.join(', ')}
          </div>
          {qList.map((q) => (
            <div key={q.question_number} className="mt-2">
              <ReviewEvidenceAccordion explanation={q.explanation} evidenceQuote={q.evidence_quote} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
