"use client";

import React from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX } from 'lucide-react';

interface ListeningAudioBarProps {
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
}

export function ListeningAudioBar({
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
}: ListeningAudioBarProps) {
  const formatAudioTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remaining = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remaining.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-zinc-900 text-white px-6 py-3.5 shrink-0 shadow-md border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4 z-20">
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          className="w-10 h-10 rounded-full bg-[#932120] hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
          title={isPlaying ? 'Tạm dừng' : 'Phát âm thanh'}
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <button
          onClick={onRewind5s}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          title="Tua lùi 5 giây"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono font-bold text-zinc-300">
          {formatAudioTime(currentTime)} / {formatAudioTime(durationSeconds)}
        </span>
      </div>

      {/* Visual Waveform Simulator */}
      <div className="flex-1 max-w-md mx-4 hidden md:flex items-center gap-1 h-6">
        {Array.from({ length: 36 }).map((_, idx) => {
          const progressRatio = durationSeconds > 0 ? currentTime / durationSeconds : 0;
          const barRatio = idx / 36;
          const isActive = barRatio <= progressRatio;
          const height = 20 + Math.sin(idx * 0.5) * 14;

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

      {/* Controls: Speed & Mute */}
      <div className="flex items-center gap-3">
        {mode === 'practice' && (
          <div className="flex items-center gap-1 bg-zinc-800 px-2 py-1 rounded-lg text-xs font-bold text-zinc-300">
            <span className="text-zinc-500 mr-1">Tốc độ:</span>
            {[0.8, 1.0, 1.2].map((speed) => (
              <button
                key={speed}
                onClick={() => onSpeedChange(speed)}
                className={`px-2 py-0.5 rounded ${
                  playbackSpeed === speed ? 'bg-[#932120] text-white' : 'hover:text-white'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onToggleMute}
          className="p-2 text-zinc-400 hover:text-white transition-colors"
          title={isMuted ? 'Bật âm lượng' : 'Tắt tiếng'}
        >
          {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
}
