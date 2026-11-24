"use client";

import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Pause, Play, RotateCcw } from 'lucide-react';
import { formatSec, type SpeakingAnnotation } from './speaking-detail-types';

interface SpeakingDetailAudioPlayerProps {
  src: string;
  durationMs?: number | null;
  pins?: SpeakingAnnotation[];
  onRegisterAudio?: (el: HTMLAudioElement | null) => void;
  onPinClick?: (startMs: number) => void;
}

const SPEED_OPTIONS = [1, 1.25, 1.5] as const;

export function SpeakingDetailAudioPlayer({
  src,
  durationMs,
  pins = [],
  onRegisterAudio,
  onPinClick,
}: SpeakingDetailAudioPlayerProps) {
  const internalRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);

  const fallbackDuration = durationMs && durationMs > 0 ? durationMs / 1000 : 0;
  const effectiveDuration =
    Number.isFinite(duration) && duration > 0 ? duration : fallbackDuration;
  const progressPct =
    effectiveDuration > 0
      ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100))
      : 0;

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const setRef = (el: HTMLAudioElement | null) => {
    internalRef.current = el;
    onRegisterAudio?.(el);
  };

  const togglePlay = () => {
    const audio = internalRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  };

  const handleRewind = () => {
    const audio = internalRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, audio.currentTime - 5);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = internalRef.current;
    const val = parseFloat(e.target.value);
    if (!audio || !Number.isFinite(val)) return;
    audio.currentTime = val;
    setCurrentTime(val);
  };

  const handleCycleSpeed = () => {
    const nextIdx = (SPEED_OPTIONS.indexOf(playbackRate as 1 | 1.25 | 1.5) + 1) % SPEED_OPTIONS.length;
    const next = SPEED_OPTIONS[nextIdx];
    setPlaybackRate(next);
    if (internalRef.current) {
      internalRef.current.playbackRate = next;
    }
  };

  const syncDuration = (audio: HTMLAudioElement) => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) {
      setDuration(audio.duration);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 space-y-2">
      <audio
        ref={setRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onLoadedMetadata={(e) => syncDuration(e.currentTarget)}
        onDurationChange={(e) => syncDuration(e.currentTarget)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          if (Number.isFinite(t)) setCurrentTime(t);
          if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
            setDuration(e.currentTarget.duration);
          }
        }}
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? 'Tạm dừng' : 'Phát bản ghi âm'}
          className="w-9 h-9 rounded-full bg-[#932120] hover:bg-[#7a1a19] text-white flex items-center justify-center shrink-0 shadow-xs transition-colors cursor-pointer"
        >
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={handleRewind}
          title="Tua lại 5 giây"
          aria-label="Tua lại 5 giây"
          className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 transition-colors shrink-0 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>

        <div className="relative flex-1 flex items-center h-6 group">
          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#932120] to-[#b83230] rounded-full transition-[width] duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-[#932120] border-2 border-white shadow-sm pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${progressPct}%` }}
          />

          <input
            type="range"
            min={0}
            max={effectiveDuration > 0 ? effectiveDuration : 1}
            step={0.1}
            value={Math.min(currentTime, effectiveDuration > 0 ? effectiveDuration : 1)}
            onChange={handleSeek}
            disabled={effectiveDuration <= 0}
            aria-label="Thanh tua audio"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          {effectiveDuration > 0 &&
            pins.map((pin) => {
              const sec = Math.max(0, (pin.start_ms || 0) / 1000);
              const pct = Math.min(98, Math.max(2, (sec / effectiveDuration) * 100));
              return (
                <button
                  key={pin.id}
                  type="button"
                  onClick={() => onPinClick?.(pin.start_ms || 0)}
                  title={`${pin.category} (${formatSec(sec)})`}
                  aria-label={`Nghe lỗi ${pin.category} tại ${formatSec(sec)}`}
                  style={{ left: `${pct}%` }}
                  className="absolute -top-1.5 -translate-x-1/2 z-10 text-rose-600 hover:scale-125 transition-transform cursor-pointer"
                >
                  <MapPin className="w-3.5 h-3.5 fill-rose-100" />
                </button>
              );
            })}
        </div>

        <span className="text-[11px] font-mono font-semibold text-slate-600 shrink-0 tabular-nums">
          {formatSec(currentTime)} / {formatSec(effectiveDuration)}
        </span>

        <button
          type="button"
          onClick={handleCycleSpeed}
          title="Đổi tốc độ phát"
          className="px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-[11px] font-bold text-slate-700 shrink-0 cursor-pointer"
        >
          {playbackRate}x
        </button>
      </div>
    </div>
  );
}
