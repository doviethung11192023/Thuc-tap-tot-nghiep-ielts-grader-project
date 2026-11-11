"use client";

import React, { useMemo } from 'react';

const norm = (word: string) => word.toLowerCase().replace(/[^a-z0-9']/g, '');

/** Marks each word of `upgraded` that is not part of the longest common word sequence with `original`. */
function changedWords(original: string, upgraded: string): { word: string; changed: boolean }[] {
  const a = original.split(/\s+/).filter(Boolean).map(norm);
  const words = upgraded.split(/\s+/).filter(Boolean);
  const b = words.map(norm);
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  const kept = new Set<number>();
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) { kept.add(j); i += 1; j += 1; } else if (table[i + 1][j] >= table[i][j + 1]) i += 1; else j += 1;
  }
  return words.map((word, j) => ({ word, changed: !kept.has(j) && b[j] !== '' }));
}

/** Upgraded answer from the part feedback, with new or changed words highlighted (spec 007, US4). */
export function SpeakingUpgradedAnswer({ original, upgraded }: { original: string; upgraded: string }) {
  const words = useMemo(() => changedWords(original, upgraded), [original, upgraded]);
  return (
    <div className="space-y-2">
      <p className="text-[11px] text-slate-500">Gợi ý của AI: giữ ý của bạn, sửa lỗi và nâng cách diễn đạt. Phần tô xanh là chỗ thay đổi.</p>
      <p className="text-sm text-slate-700 leading-relaxed">
        {words.map((item, index) => (
          <React.Fragment key={index}>
            {item.changed ? <mark className="bg-emerald-100 text-emerald-900 rounded px-0.5">{item.word}</mark> : item.word}{' '}
          </React.Fragment>
        ))}
      </p>
    </div>
  );
}
