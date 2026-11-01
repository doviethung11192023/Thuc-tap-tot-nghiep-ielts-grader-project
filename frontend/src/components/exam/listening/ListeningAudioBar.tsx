"use client";

import React from 'react';
import { Play, Pause, RotateCcw, Volume2, Volume1, VolumeX } from 'lucide-react';

interface ListeningAudioBarProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioUrl?: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  durationSeconds: number;
  onRewind5s: () => void;
  playbackSpeed: number;
  onSpeedChange: (speed: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  mode: 'exam' | 'practice';
  volume?: number;
  onVolumeChange?: (vol: number) => void;
  onSeek?: (time: number) => void;
  audioEventHandlers?: {
    onTimeUpdate: () => void;
    onLoadedMetadata: () => void;
    onEnded: () => void;
  };
}

export function ListeningAudioBar({
  audioRef,
  audioUrl,
  isPlaying,
  onTogglePlay,
  currentTime,
  durationSeconds,
  onRewind5s,
  playbackSpeed,
  onSpeedChange,
  isMuted,
  onToggleMute,
  mode,
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

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    if (onSeek) onSeek(target);
  };

  return (
    <div className="bg-zinc-900 text-white px-6 py-3 shrink-0 shadow-md border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 z-20">
      {/* Thẻ audio HTML5 thực tế */}
      <audio
        ref={audioRef}
        src={audioUrl}
        preload="auto"
        onTimeUpdate={audioEventHandlers?.onTimeUpdate}
        onLoadedMetadata={audioEventHandlers?.onLoadedMetadata}
        onEnded={audioEventHandlers?.onEnded}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="w-10 h-10 rounded-full bg-[#932120] hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95 cursor-pointer"
          title={isPlaying ? 'Tạm dừng' : 'Phát âm thanh thực tế'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          onClick={onRewind5s}
          className="p-2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Tua lùi 5 giây"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono font-bold text-zinc-300">
          {formatAudioTime(currentTime)} / {formatAudioTime(durationSeconds)}
        </span>
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

        {/* Thanh trượt seeker cho phép click tua khi luyện tập */}
        <div className="relative w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#932120] rounded-full transition-all duration-75"
            style={{ width: `${progressRatio * 100}%` }}
          />
          {mode === 'practice' && (
            <input
              type="range"
              min={0}
              max={durationSeconds || 450}
              step={1}
              value={currentTime}
              onChange={handleSeek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          )}
        </div>
      </div>

      {/* Controls: Speed & Volume Adjustment */}
      <div className="flex items-center gap-3">
        {mode === 'practice' && (
          <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg text-xs font-bold text-zinc-300">
            <span className="text-zinc-500 mr-1">Tốc độ:</span>
            {[0.8, 1.0, 1.2].map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-0.5 rounded cursor-pointer ${
                  playbackSpeed === speed ? 'bg-[#932120] text-white' : 'hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}

        {/* Volume Controller */}
        <div className="flex items-center gap-1.5 pl-2 border-l border-zinc-800">
          <button
            onClick={onToggleMute}
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
