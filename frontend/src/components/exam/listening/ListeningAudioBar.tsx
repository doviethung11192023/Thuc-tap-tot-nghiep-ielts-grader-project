// Lucian UX/UI Prompt #055 inspired · Studio Dark Listening Player (MIT adapted)
"use client";

import React, { useEffect } from 'react';
import { Play, Pause, RotateCcw, RotateCw, Volume2, Volume1, VolumeX, Loader2, AlertCircle } from 'lucide-react';

interface ListeningAudioBarProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioUrl?: string;
  isPlaying: boolean;
  isBuffering?: boolean;
  audioError?: string | null;
  onTogglePlay: () => void;
  currentTime: number;
  durationSeconds: number;
  onRewind5s: () => void;
  onForward5s?: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  mode: 'exam' | 'practice';
  activeAudioSectionNumber?: number;
  totalSections?: number;
  examPhase?: 'audio' | 'review' | 'expired';
  volume?: number;
  onVolumeChange?: (vol: number) => void;
  onSeek?: (time: number) => void;
  audioEventHandlers?: {
    onTimeUpdate: () => void;
    onLoadedMetadata: () => void;
    onCanPlay?: () => void;
    onWaiting?: () => void;
    onError?: () => void;
    onEnded: () => void;
  };
}

export function ListeningAudioBar({
  audioRef,
  audioUrl,
  isPlaying,
  isBuffering = false,
  audioError = null,
  onTogglePlay,
  currentTime,
  durationSeconds,
  onRewind5s,
  onForward5s,
  playbackSpeed,
  onSpeedChange,
  isMuted,
  onToggleMute,
  mode,
  activeAudioSectionNumber = 1,
  totalSections = 4,
  examPhase = 'audio',
  volume = 1,
  onVolumeChange,
  onSeek,
  audioEventHandlers,
}: ListeningAudioBarProps) {
  const formatAudioTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = Math.floor(secs % 60);
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  const effectiveVol = isMuted ? 0 : volume;
  const progressRatio = durationSeconds > 0 ? Math.min(1, Math.max(0, currentTime / durationSeconds)) : 0;
  const isExamPlayLocked = mode === 'exam' && (isPlaying || examPhase === 'review' || examPhase === 'expired');

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (onSeek) onSeek(target);
  };

  // Practice-only keyboard shortcuts: Space = Play/Pause, ArrowLeft/Right = -/+5s
  useEffect(() => {
    if (mode !== 'practice') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return;
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onRewind5s();
      } else if (e.key === 'ArrowRight' && onForward5s) {
        e.preventDefault();
        onForward5s();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, onTogglePlay, onRewind5s, onForward5s]);

  return (
    <div className="studio-dark bg-[#0F172A] text-white px-6 py-3 shrink-0 shadow-md border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 z-20">
      {/* Thẻ audio HTML5 thực tế */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onTimeUpdate={audioEventHandlers?.onTimeUpdate}
        onLoadedMetadata={audioEventHandlers?.onLoadedMetadata}
        onCanPlay={audioEventHandlers?.onCanPlay}
        onWaiting={audioEventHandlers?.onWaiting}
        onError={audioEventHandlers?.onError}
        onEnded={audioEventHandlers?.onEnded}
      />

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onTogglePlay}
          disabled={isExamPlayLocked}
          aria-label={isPlaying ? 'Tạm dừng audio' : 'Phát audio'}
          className={`w-10 h-10 rounded-full text-white flex items-center justify-center shadow-lg transition-transform ${
            isExamPlayLocked
              ? 'bg-[#932120]/70 cursor-not-allowed opacity-85'
              : 'bg-[#932120] hover:bg-red-700 active:scale-95 cursor-pointer'
          }`}
          title={
            mode === 'exam'
              ? examPhase === 'review'
                ? 'Audio thi đã kết thúc'
                : isPlaying
                  ? 'Phòng thi: Không thể tạm dừng audio'
                  : 'Bắt đầu phát Audio phòng thi'
              : isPlaying
                ? 'Tạm dừng'
                : 'Phát âm thanh thực tế'
          }
        >
          {isBuffering ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        {mode === 'practice' && (
          <>
            <button
              type="button"
              onClick={onRewind5s}
              aria-label="Tua lùi 5 giây (Phím ←)"
              className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5 text-xs font-semibold tabular-nums"
              title="Tua lùi 5 giây (Phím mũi tên trái ←)"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">-5s</span>
            </button>

            {onForward5s && (
              <button
                type="button"
                onClick={onForward5s}
                aria-label="Tua tới 5 giây (Phím →)"
                className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center gap-0.5 text-xs font-semibold tabular-nums"
                title="Tua tới 5 giây (Phím mũi tên phải →)"
              >
                <RotateCw className="w-4 h-4" />
                <span className="hidden sm:inline">+5s</span>
              </button>
            )}
          </>
        )}

        <span className="text-xs font-mono tabular-nums font-bold text-zinc-200">
          {formatAudioTime(currentTime)} <span className="text-zinc-500">/</span> {formatAudioTime(durationSeconds)}
        </span>

        {audioError && (
          <span
            role="status"
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 bg-amber-950/70 border border-amber-700/60 px-2 py-0.5 rounded-md"
          >
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {audioError}
          </span>
        )}
      </div>

      {/* Visual Waveform + Interactive Progress Track */}
      <div className="flex-1 max-w-md mx-4 hidden md:flex flex-col justify-center gap-1.5 h-8 relative">
        <div className="flex items-center gap-1 h-4">
          {Array.from({ length: 36 }).map((_, idx) => {
            const barRatio = idx / 36;
            const isActive = barRatio <= progressRatio;
            const height = 30 + Math.sin(idx * 0.5) * 16;

            return (
              <div
                key={idx}
                className={`flex-1 rounded-full transition-all duration-150 ${
                  isActive ? 'bg-[#932120]' : 'bg-zinc-700'
                } ${isPlaying && isActive ? 'animate-pulse' : ''}`}
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>

        {/* Thanh trượt seeker với hiệu ứng knob Lucian #055 */}
        <div className="group/rail relative w-full h-1.5 hover:h-2 bg-slate-800 rounded-full transition-all">
          <div
            className="h-full bg-gradient-to-r from-[#932120] to-amber-500 rounded-full transition-all duration-75"
            style={{ width: `${progressRatio * 100}%` }}
          />
          {mode === 'practice' && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 -ml-1.5 w-3 h-3 rounded-full bg-white shadow-md opacity-0 group-hover/rail:opacity-100 transition-opacity"
                style={{ left: `${progressRatio * 100}%` }}
              />
              <input
                type="range"
                aria-label="Tiến độ âm thanh"
                min={0}
                max={durationSeconds || 450}
                step={1}
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </>
          )}
        </div>
      </div>

      {/* Controls: Speed, Exam Status & Volume Adjustment */}
      <div className="flex items-center gap-3">
        {mode === 'practice' ? (
          <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg text-xs font-bold text-zinc-300">
            <span className="text-zinc-500 mr-1">Tốc độ:</span>
            {[0.8, 1.0, 1.2].map((speed) => (
              <button
                key={speed}
                type="button"
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  playbackSpeed === speed ? 'bg-[#932120] text-white' : 'hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        ) : (
          <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 text-[11px] font-semibold text-zinc-300 border border-zinc-700">
            {examPhase === 'review' ? (
              <span className="text-amber-300">Audio đã kết thúc • 2 phút kiểm tra bài</span>
            ) : examPhase === 'expired' ? (
              <span className="text-red-300">Hết giờ • Đang tự động nộp bài</span>
            ) : (
              <span>
                Đang phát Section {activeAudioSectionNumber}/{totalSections} • Khóa tua & tạm dừng
              </span>
            )}
          </span>
        )}

        {/* Volume Controller */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
            className="p-1.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
          >
            {isMuted || effectiveVol === 0 ? (
              <VolumeX className="w-4 h-4 text-red-400" />
            ) : effectiveVol < 0.5 ? (
              <Volume1 className="w-4 h-4 text-zinc-300" />
            ) : (
              <Volume2 className="w-4 h-4 text-zinc-300" />
            )}
          </button>

          <div
            className="w-16 sm:w-20 relative flex items-center h-6 cursor-pointer"
            title={`Âm lượng: ${Math.round(effectiveVol * 100)}%`}
          >
            <div className="w-full h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-75"
                style={{ width: `${effectiveVol * 100}%` }}
              />
            </div>
            <input
              type="range"
              aria-label="Âm lượng"
              min={0}
              max={1}
              step={0.01}
              value={effectiveVol}
              onChange={(e) => onVolumeChange?.(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute w-2.5 h-2.5 bg-white rounded-full shadow pointer-events-none"
              style={{ left: `calc(${effectiveVol * 100}% - 5px)` }}
            />
          </div>

          <span className="text-[10px] text-zinc-400 font-mono w-7 text-right select-none hidden sm:inline-block">
            {Math.round(effectiveVol * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
