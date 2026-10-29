"use client";

import React from 'react';
import { Play, Pause, Volume2, VolumeX, FastForward, Rewind } from 'lucide-react';

interface CleanListeningAudioBarProps {
  audioRef: React.RefObject<HTMLAudioElement | null>;
  audioUrl: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fallbackDuration: number;
  playbackRate: number;
  isMuted: boolean;
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

  return (
    <div className="bg-white border-b border-zinc-200 px-5 py-1.5 h-12 flex items-center justify-between gap-4 shrink-0 shadow-2xs z-10">
      {/* Nút điều khiển lùi 10s / Play / tới 10s */}
      <div className="flex items-center gap-2">
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

      {/* Thanh tua tiến độ (Slider) */}
      <div className="flex-1 flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={totalDuration}
          value={currentTime}
          onChange={onSeek}
          className="w-full h-1.5 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-blue-600 hover:bg-zinc-300 transition-colors"
        />
      </div>

      {/* Thời gian + Tốc độ + Âm lượng */}
      <div className="flex items-center gap-3 shrink-0 text-xs font-semibold text-zinc-600">
        <span className="font-mono text-zinc-800">
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

        <button
          type="button"
          onClick={onToggleMute}
          className="w-7 h-7 flex items-center justify-center text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
          title={isMuted ? "Bật âm" : "Tắt tiếng"}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
