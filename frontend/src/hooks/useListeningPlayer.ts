"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface UseListeningPlayerProps {
  audioUrl?: string;
  sectionKey?: string;
  defaultDuration?: number;
}

export function useListeningPlayer({
  audioUrl,
  sectionKey,
  defaultDuration = 450,
}: UseListeningPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const savedTimeBySectionRef = useRef<Record<string, number>>({});
  const currentKey = sectionKey || audioUrl || "default";
  const activeKeyRef = useRef<string>(currentKey);
  const pendingSeekRef = useRef<number | null>(null);
  const playbackSpeedRef = useRef<number>(1.0);

  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isBuffering, setIsBuffering] = useState<boolean>(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);

  useEffect(() => {
    if (defaultDuration > 0) {
      setDuration(defaultDuration);
    }
  }, [defaultDuration]);

  // Preserve each section's playback position when switching Section tabs
  useEffect(() => {
    const audio = audioRef.current;
    const prevKey = activeKeyRef.current;
    if (audio && prevKey !== currentKey) {
      savedTimeBySectionRef.current[prevKey] = audio.currentTime || 0;
    }
    activeKeyRef.current = currentKey;

    const savedTime = savedTimeBySectionRef.current[currentKey] || 0;
    pendingSeekRef.current = savedTime > 0 ? savedTime : null;

    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    setAudioError(null);
    setIsBuffering(Boolean(audioUrl));
    setCurrentTime(savedTime);

    if (audioUrl) {
      audio.src = audioUrl;
      audio.load();
    } else {
      setIsBuffering(false);
    }
  }, [audioUrl, currentKey]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    if (isPlaying) {
      audio.pause();
      savedTimeBySectionRef.current[activeKeyRef.current] = audio.currentTime || 0;
      setIsPlaying(false);
    } else {
      setAudioError(null);
      audio.playbackRate = playbackSpeedRef.current;
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsBuffering(false);
        })
        .catch((err) => {
          console.warn("Audio play prevented or error:", err);
          setIsPlaying(false);
          setIsBuffering(false);
          setAudioError("Không phát được âm thanh. Vui lòng bấm Play lại.");
        });
    }
  }, [isPlaying, audioUrl]);

  const seek = useCallback(
    (timeInSeconds: number) => {
      const audio = audioRef.current;
      if (!audio) return;
      const clamped = Math.max(0, Math.min(timeInSeconds, duration || defaultDuration || 450));
      audio.currentTime = clamped;
      savedTimeBySectionRef.current[activeKeyRef.current] = clamped;
      setCurrentTime(clamped);
    },
    [duration, defaultDuration]
  );

  const rewind = useCallback((seconds: number = 5) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, audio.currentTime - seconds);
    audio.currentTime = target;
    savedTimeBySectionRef.current[activeKeyRef.current] = target;
    setCurrentTime(target);
  }, []);

  const forward = useCallback(
    (seconds: number = 5) => {
      const audio = audioRef.current;
      if (!audio) return;
      const maxDur = (audio.duration && !isNaN(audio.duration) ? audio.duration : duration) || defaultDuration || 450;
      const target = Math.min(maxDur, audio.currentTime + seconds);
      audio.currentTime = target;
      savedTimeBySectionRef.current[activeKeyRef.current] = target;
      setCurrentTime(target);
    },
    [duration, defaultDuration]
  );

  const changeSpeed = useCallback((speed: number) => {
    playbackSpeedRef.current = speed;
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const changeVolume = useCallback(
    (val: number) => {
      const clamped = Math.max(0, Math.min(1, val));
      setVolume(clamped);
      if (audioRef.current) {
        audioRef.current.volume = clamped;
        if (clamped > 0 && isMuted) {
          audioRef.current.muted = false;
          setIsMuted(false);
        }
      }
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      if (audioRef.current) {
        audioRef.current.muted = next;
      }
      return next;
    });
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      const t = audioRef.current.currentTime;
      savedTimeBySectionRef.current[activeKeyRef.current] = t;
      setCurrentTime(t);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.duration && !isNaN(audio.duration)) {
      setDuration(Math.round(audio.duration));
      if (pendingSeekRef.current && pendingSeekRef.current < audio.duration) {
        audio.currentTime = pendingSeekRef.current;
        setCurrentTime(pendingSeekRef.current);
      }
    }
    pendingSeekRef.current = null;
    audio.playbackRate = playbackSpeedRef.current;
    setIsBuffering(false);
    setAudioError(null);
  }, []);

  const handleCanPlay = useCallback(() => {
    setIsBuffering(false);
    setAudioError(null);
  }, []);

  const handleWaiting = useCallback(() => {
    setIsBuffering(true);
  }, []);

  const handleError = useCallback(() => {
    setIsPlaying(false);
    setIsBuffering(false);
    setAudioError("Lỗi tải file âm thanh. Vui lòng kiểm tra kết nối mạng.");
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    savedTimeBySectionRef.current[activeKeyRef.current] = 0;
    setCurrentTime(0);
  }, []);

  return {
    audioRef,
    isPlaying,
    isBuffering,
    audioError,
    currentTime,
    duration: duration || defaultDuration,
    playbackSpeed,
    isMuted,
    volume,
    togglePlay,
    seek,
    rewind,
    forward,
    changeSpeed,
    changeVolume,
    toggleMute,
    audioEventHandlers: {
      onTimeUpdate: handleTimeUpdate,
      onLoadedMetadata: handleLoadedMetadata,
      onCanPlay: handleCanPlay,
      onWaiting: handleWaiting,
      onError: handleError,
      onEnded: handleEnded,
    },
  };
}
