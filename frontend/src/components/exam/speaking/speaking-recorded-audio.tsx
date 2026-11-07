'use client';

import React from 'react';

interface SpeakingRecordedAudioProps {
  src: string;
  className?: string;
}

/**
 * Trình phát cho audio ghi bằng MediaRecorder.
 *
 * File WebM kiểu này không ghi độ dài trong header, nên Chrome báo duration = Infinity: đồng hồ
 * đứng ở 0:00 và không tua được. Tua tới cuối một lần buộc trình duyệt đọc hết file để tính độ dài,
 * rồi quay về đầu.
 */
export function SpeakingRecordedAudio({ src, className }: SpeakingRecordedAudioProps) {
  const revealDuration = (event: React.SyntheticEvent<HTMLAudioElement>) => {
    const audio = event.currentTarget;
    if (audio.duration !== Infinity) return;
    audio.addEventListener('durationchange', () => { audio.currentTime = 0; }, { once: true });
    audio.currentTime = Number.MAX_SAFE_INTEGER;
  };

  return <audio src={src} controls className={className} onLoadedMetadata={revealDuration} />;
}
