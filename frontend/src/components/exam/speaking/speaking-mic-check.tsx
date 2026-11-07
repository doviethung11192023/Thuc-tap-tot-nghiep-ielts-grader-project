"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Mic, RotateCcw } from 'lucide-react';
import type { RecordedAnswer } from '@/hooks/useSpeakingRecorder';
import { SpeakingRecordedAudio } from './speaking-recorded-audio';

const CHECK_SECONDS = 5;
/** RMS đỉnh dưới mức này thường là micro quá nhỏ hoặc sai thiết bị. */
const QUIET_PEAK = 0.02;

interface SpeakingMicCheckProps {
  micError: string | null;
  requestMic: () => Promise<boolean>;
  getLevel: () => number;
  startRecording: () => boolean;
  stopRecording: () => Promise<RecordedAnswer | null>;
  onPassed: () => void;
}

/** mic_check của ST_speaking_room: ghi 5 s, phát lại, kiểm âm lượng. Bản ghi này không được upload. */
export const SpeakingMicCheck: React.FC<SpeakingMicCheckProps> = ({
  micError, requestMic, getLevel, startRecording, stopRecording, onPassed,
}) => {
  const [recording, setRecording] = useState(false);
  const [level, setLevel] = useState(0);
  const [peak, setPeak] = useState(0);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  useEffect(() => () => {
    if (playbackUrl) URL.revokeObjectURL(playbackUrl);
  }, [playbackUrl]);

  const handleStart = async () => {
    if (!(await requestMic()) || !startRecording()) return;
    setPlaybackUrl(null);
    setPeak(0);
    setRecording(true);
    const endsAt = Date.now() + CHECK_SECONDS * 1000;
    timerRef.current = setInterval(async () => {
      const current = getLevel();
      setLevel(current);
      setPeak((value) => Math.max(value, current));
      if (Date.now() < endsAt) return;
      if (timerRef.current) clearInterval(timerRef.current);
      setRecording(false);
      setLevel(0);
      const answer = await stopRecording();
      if (answer) setPlaybackUrl(URL.createObjectURL(answer.blob));
    }, 100);
  };

  const tooQuiet = playbackUrl !== null && peak < QUIET_PEAK;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 sm:p-8 space-y-4 text-center">
        <h2 className="text-lg sm:text-xl font-bold text-slate-800">Kiểm tra micro</h2>
        <p className="text-sm text-slate-600">Bấm ghi rồi nói một câu trong {CHECK_SECONDS} giây, sau đó nghe lại xem có rõ không.</p>

        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all duration-100" style={{ width: `${Math.min(100, level * 400)}%` }} />
        </div>

        {micError && <p className="text-sm text-red-600">{micError}</p>}
        {tooQuiet && <p className="text-sm text-amber-700">Âm thanh quá nhỏ. Hãy kiểm tra micro rồi thử lại, nếu không bài chấm sẽ kém chính xác.</p>}
        {playbackUrl && <SpeakingRecordedAudio src={playbackUrl} className="w-full" />}

        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            onClick={handleStart}
            disabled={recording}
            className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-semibold rounded-2xl text-sm flex items-center justify-center gap-2"
          >
            {playbackUrl ? <RotateCcw className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{recording ? 'Đang ghi...' : playbackUrl ? 'Thử lại' : 'Ghi thử'}</span>
          </button>
          <button
            onClick={onPassed}
            disabled={!playbackUrl}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-2xl text-sm"
          >
            Micro đã ổn
          </button>
        </div>
      </div>
    </div>
  );
};
