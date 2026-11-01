"use client";

import React from 'react';
import { Play, Pause, Volume2, Volume1, VolumeX, FastForward, Rewind } from 'lucide-react';

interface CleanListeningAudioBarProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fallbackDuration: number;
  playbackRate: number;
  isMuted: boolean;
  volume: number;
  onVolumeChange: (val: number) => void;
  onTogglePlay: () => void;
  onTimeUpdate: () => void;
  onLoadedMetadata: () => void;
  onEnded: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRewind10: () => void;
  onForward10: () => void;
  onChangePlaybackRate: () => void;
  onToggleMute: () => void;
  formatAudioTime: (seconds: number) => string;
}

export function CleanListeningAudioBar({
  audioRef,
  audioUrl,
  isPlaying,
  currentTime,
  duration,
  fallbackDuration,
  playbackRate,
  isMuted,
  volume,
  onVolumeChange,
  onTogglePlay,
  onTimeUpdate,
  onLoadedMetadata,
  onEnded,
  onSeek,
  onRewind10,
  onForward10,
  onChangePlaybackRate,
  onToggleMute,
  formatAudioTime
}: CleanListeningAudioBarProps) {
  const totalDuration = duration || fallbackDuration;
  const progressPercent = totalDuration > 0 ? Math.min(100, Math.max(0, (currentTime / totalDuration) * 100)) : 0;
  const effectiveVolume = isMuted ? 0 : volume;

  return (
    <div className="bg-white border-b border-zinc-200 px-4 sm:px-5 py-1.5 h-13 flex items-center justify-between gap-3 sm:gap-4 shrink-0 shadow-2xs z-10">
      {/* Nút điều khiển lùi 10s / Play / tới 10s */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <button
          type="button"
          onClick={onRewind10}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-blue-600 hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Lùi 10 giây"
        >
          <Rewind className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          className="w-8 h-8 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-xs transition-colors cursor-pointer"
          title={isPlaying ? "Tạm dừng" : "Phát âm thanh"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={onForward10}
          className="w-8 h-8 rounded-full flex items-center justify-center text-zinc-600 hover:text-blue-600 hover:bg-zinc-100 transition-colors cursor-pointer"
          title="Tới 10 giây"
        >
          <FastForward className="w-4 h-4" />
        </button>
      </div>

      {/* Audio Element ngầm */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={onTimeUpdate}
        onLoadedMetadata={onLoadedMetadata}
        onEnded={onEnded}
      />

      {/* Thanh tua tiến độ (Slider với Track rõ ràng & Progress fill) */}
      <div className="flex-1 relative flex items-center group h-6 cursor-pointer min-w-[120px]">
        {/* Track nền xám rõ nét */}
        <div className="w-full h-2 bg-zinc-200 rounded-full overflow-hidden relative shadow-inner">
          {/* Thanh fill tiến độ xanh dương */}
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-75"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {/* Input bắt sự kiện kéo/click */}
        <input
          type="range"
          min={0}
          max={totalDuration}
          step={0.1}
          value={currentTime}
          onChange={onSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        {/* Nút tròn thumb định vị theo % */}
        <div
          className="absolute w-3.5 h-3.5 bg-blue-600 border-2 border-white rounded-full shadow-md pointer-events-none transition-transform group-hover:scale-125"
          style={{ left: `calc(${progressPercent}% - 7px)` }}
        />
      </div>

      {/* Thời gian + Tốc độ + Chỉnh âm lượng */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-xs font-semibold text-zinc-600">
        <span className="font-mono text-zinc-800 text-[11px] sm:text-xs">
          {formatAudioTime(currentTime)} / {formatAudioTime(totalDuration)}
        </span>

        <button
          type="button"
          onClick={onChangePlaybackRate}
          className="px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 rounded-md text-[11px] font-bold text-zinc-700 transition-colors cursor-pointer"
          title="Đổi tốc độ phát"
        >
          {playbackRate}x
        </button>

        {/* Cụm điều khiển âm lượng */}
        <div className="flex items-center gap-1.5 pl-1 border-l border-zinc-200">
          <button
            type="button"
            onClick={onToggleMute}
            className="w-7 h-7 flex items-center justify-center text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
            title={isMuted ? "Bật âm thanh" : "Tắt tiếng"}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-red-500" />
            ) : volume < 0.5 ? (
              <Volume1 className="w-4 h-4 text-zinc-700" />
            ) : (
              <Volume2 className="w-4 h-4 text-zinc-700" />
            )}
          </button>

          {/* Thanh trượt chỉnh âm lượng */}
          <div className="w-14 sm:w-20 relative flex items-center h-6 cursor-pointer" title={`Âm lượng: ${Math.round(effectiveVolume * 100)}%`}>
            <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-zinc-700 rounded-full transition-all duration-75"
                style={{ width: `${effectiveVolume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={effectiveVolume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div
              className="absolute w-2.5 h-2.5 bg-zinc-700 border border-white rounded-full shadow-2xs pointer-events-none"
              style={{ left: `calc(${effectiveVolume * 100}% - 5px)` }}
            />
          </div>

          <span className="text-[10px] text-zinc-400 font-mono w-7 text-right select-none hidden sm:inline-block">
            {Math.round(effectiveVolume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
