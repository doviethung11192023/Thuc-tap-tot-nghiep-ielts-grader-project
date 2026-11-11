"use client";

import React, { useState } from 'react';
import { SpeakingAnnotatedTranscript } from './speaking-annotated-transcript';
import { SpeakingUpgradedAnswer } from './speaking-upgraded-answer';
import {
  EDIT_CATEGORY_LABELS, EDIT_KIND_LABELS, STRENGTH_GROUP_LABELS,
  type SpeakingEdit, type SpeakingPronunciationHint, type SpeakingStrength,
} from './speaking-feedback-types';

interface Props {
  transcript: string | null;
  audioUrl: string | null;
  edits: SpeakingEdit[];
  strengths: SpeakingStrength[];
  hints: SpeakingPronunciationHint[];
  upgradedAnswer?: string;
}

type Tab = 'improve' | 'strengths' | 'upgrade';

function EditItem({ edit, index, open, onToggle }: { edit: SpeakingEdit; index: number; open: boolean; onToggle: () => void }) {
  return (
    <li className={`rounded-xl border ${open ? 'border-red-300 bg-red-50/50' : 'border-slate-200'}`}>
      <button type="button" onClick={onToggle} className="w-full text-left px-3 py-2 text-xs flex gap-2 items-baseline">
        <span className="font-bold text-red-600">{index + 1}</span>
        <span className="text-slate-700">
          {EDIT_KIND_LABELS[edit.kind]}:{' '}
          {edit.original && <s className="text-red-600">{edit.original}</s>}
          {edit.original && edit.corrected && ' → '}
          {edit.corrected && <span className="text-emerald-700 font-semibold">{edit.corrected}</span>}
        </span>
      </button>
      {open && (
        <div className="px-3 pb-2 text-xs text-slate-600 space-y-0.5">
          <p><strong>Phân loại:</strong> {EDIT_CATEGORY_LABELS[edit.category] ?? edit.category}</p>
          {edit.explanation && <p><strong>Giải thích:</strong> {edit.explanation}</p>}
        </div>
      )}
    </li>
  );
}

/**
 * One response's detailed feedback (spec 007): annotated transcript plus tabs for errors,
 * strengths and the upgraded answer. All items are AI estimates (FR-011).
 */
export function SpeakingAnswerFeedback({ transcript, audioUrl, edits, strengths, hints, upgradedAnswer }: Props) {
  const [tab, setTab] = useState<Tab>('improve');
  const [selected, setSelected] = useState<number | null>(null);
  if (!transcript) return <p className="text-sm text-slate-500 bg-slate-50 rounded-xl p-3">Không nghe được câu trả lời.</p>;

  const select = (index: number) => { setTab('improve'); setSelected(selected === index ? null : index); };
  const grammar = edits.map((edit, index) => ({ edit, index })).filter(({ edit }) => edit.criterion === 'GRA');
  const vocabulary = edits.map((edit, index) => ({ edit, index })).filter(({ edit }) => edit.criterion === 'LR');
  const tabs: [Tab, string][] = [['improve', `Cần cải thiện (${edits.length})`], ['strengths', `Điểm mạnh (${strengths.length})`]];
  if (upgradedAnswer) tabs.push(['upgrade', 'Bài nâng cấp']);

  return (
    <div className="space-y-3">
      <SpeakingAnnotatedTranscript transcript={transcript} edits={edits} hints={hints} audioUrl={audioUrl}
        selected={selected} onSelect={select} />
      {hints.length > 0 && (
        <p className="text-[11px] text-amber-700">Từ gạch chấm vàng: có thể phát âm chưa rõ (ước lượng của máy). Bấm để nghe lại.</p>
      )}
      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`px-3 py-1.5 text-xs font-bold ${tab === key ? 'text-blue-700 border-b-2 border-blue-600' : 'text-slate-500'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'improve' && (
        <div className="space-y-3">
          {edits.length === 0 && <p className="text-xs text-slate-500">AI không đánh dấu lỗi ngữ pháp hay từ vựng nào trong câu này.</p>}
          {[['Lỗi ngữ pháp', grammar], ['Lỗi từ vựng', vocabulary]].map(([title, items]) => (items as typeof grammar).length > 0 && (
            <div key={title as string} className="space-y-1.5">
              <h4 className="text-xs font-bold text-slate-700">{title as string} ({(items as typeof grammar).length})</h4>
              <ul className="space-y-1.5">
                {(items as typeof grammar).map(({ edit, index }) => (
                  <EditItem key={index} edit={edit} index={index} open={selected === index} onToggle={() => select(index)} />
                ))}
              </ul>
            </div>
          ))}
          <p className="text-[11px] text-slate-400">
            Lỗi do AI đánh dấu trên bản ghi chữ tự động. Máy nhận dạng giọng nói đôi khi tự sửa lời nói, nên một số lỗi có thể không hiện.
          </p>
        </div>
      )}
      {tab === 'strengths' && (
        <div className="space-y-2">
          {strengths.length === 0 && <p className="text-xs text-slate-500">Chưa có điểm mạnh nổi bật nào được ghi nhận.</p>}
          {(Object.keys(STRENGTH_GROUP_LABELS) as SpeakingStrength['group'][]).map((group) => {
            const items = strengths.filter((s) => s.group === group);
            return items.length > 0 && (
              <div key={group} className="space-y-1">
                <h4 className="text-xs font-bold text-slate-700">{STRENGTH_GROUP_LABELS[group]} ({items.length})</h4>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((s) => (
                    <span key={s.start} className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs">{s.text}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'upgrade' && upgradedAnswer && <SpeakingUpgradedAnswer original={transcript} upgraded={upgradedAnswer} />}
    </div>
  );
}
