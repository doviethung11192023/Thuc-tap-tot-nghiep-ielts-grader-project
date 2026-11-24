"use client";

import React, { useMemo, useRef } from 'react';
import type { SpeakingEdit, SpeakingPronunciationHint } from './speaking-feedback-types';

interface Props {
  transcript: string;
  edits: SpeakingEdit[];
  hints: SpeakingPronunciationHint[];
  audioUrl: string | null;
  selected: number | null;
  onSelect: (index: number) => void;
}

interface Segment {
  start: number;
  end: number;
  edit: number | null;         // index into edits covering this text
  hint: SpeakingPronunciationHint | null;
}

/** Cuts the transcript at every mark boundary so each piece has at most one error and one hint. */
function segments(text: string, edits: SpeakingEdit[], hints: SpeakingPronunciationHint[]): Segment[] {
  const cuts = new Set([0, text.length]);
  edits.forEach((e) => { cuts.add(e.start); cuts.add(e.end); });
  hints.forEach((h) => { cuts.add(h.start); cuts.add(h.end); });
  const points = [...cuts].filter((p) => p >= 0 && p <= text.length).sort((a, b) => a - b);
  const result: Segment[] = [];
  for (let i = 0; i < points.length - 1; i += 1) {
    const [start, end] = [points[i], points[i + 1]];
    const edit = edits.findIndex((e) => e.start < e.end && e.start <= start && end <= e.end);
    const hint = hints.find((h) => h.start <= start && end <= h.end) ?? null;
    result.push({ start, end, edit: edit >= 0 ? edit : null, hint });
  }
  return result;
}

/**
 * Transcript with numbered error marks (spec 007, US1) and possible-mispronunciation highlights (US2).
 * A missing word is shown as a numbered gap marker; a hint plays that word from the recording.
 */
export function SpeakingAnnotatedTranscript({ transcript, edits, hints, audioUrl, selected, onSelect }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pieces = useMemo(() => segments(transcript, edits, hints), [transcript, edits, hints]);

  const playWord = (hint: SpeakingPronunciationHint) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (stopTimer.current) clearTimeout(stopTimer.current);
    audio.currentTime = Math.max(0, hint.start_sec - 0.05);
    void audio.play();
    stopTimer.current = setTimeout(() => audio.pause(), (hint.end_sec - hint.start_sec) * 1000 + 150);
  };

  const gapMarker = (index: number) => (
    <button key={`gap-${index}`} type="button" onClick={() => onSelect(index)}
      className={`mx-0.5 px-1 rounded text-red-600 font-bold border-b-2 border-red-500 ${selected === index ? 'bg-red-100' : ''}`}
      title="Thiếu từ">
      [...]<sup>{index + 1}</sup>
    </button>
  );

  const rendered: React.ReactNode[] = [];
  pieces.forEach((piece, i) => {
    edits.forEach((e, index) => { if (e.start === e.end && e.start === piece.start) rendered.push(gapMarker(index)); });
    const text = transcript.slice(piece.start, piece.end);
    const lastOfEdit = piece.edit !== null && edits[piece.edit].end === piece.end;
    if (piece.edit !== null) {
      const index = piece.edit;
      rendered.push(
        <button key={i} type="button" onClick={() => onSelect(index)}
          className={`text-red-700 underline decoration-red-500 decoration-2 underline-offset-4 ${selected === index ? 'bg-red-100 rounded' : ''}`}>
          {text}{lastOfEdit && <sup className="font-bold">{index + 1}</sup>}
        </button>,
      );
    } else if (piece.hint) {
      const hint = piece.hint;
      rendered.push(
        <button key={i} type="button" onClick={() => playWord(hint)} disabled={!audioUrl}
          className="text-amber-700 underline decoration-dotted decoration-amber-500 underline-offset-4 disabled:cursor-default"
          title={audioUrl ? 'Có thể phát âm chưa rõ — bấm để nghe lại từ này' : 'Có thể phát âm chưa rõ (audio đã xoá)'}>
          {text}
        </button>,
      );
    } else {
      rendered.push(<span key={i}>{text}</span>);
    }
  });
  edits.forEach((e, index) => { if (e.start === e.end && e.start === transcript.length) rendered.push(gapMarker(index)); });

  return (
    <div className="text-sm text-slate-700 leading-loose bg-slate-50 rounded-xl p-3">
      {rendered}
      {audioUrl && hints.length > 0 && <audio ref={audioRef} src={audioUrl} preload="auto" className="hidden" />}
    </div>
  );
}
