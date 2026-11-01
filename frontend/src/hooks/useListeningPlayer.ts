"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface UseListeningPlayerProps {
  audioUrl?: string;
  defaultDuration?: number;
}

export function useListeningPlayer({ audioUrl, defaultDuration = 450 }: UseListeningPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(defaultDuration);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(1.0);

  // Cập nhật duration khi defaultDuration thay đổi từ section
  useEffect(() => {
    if (defaultDuration > 0) {
      setDuration(defaultDuration);
    }
  }, [defaultDuration]);

  // Khi audioUrl đổi (chuyển Part 1 -> Part 2...)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);

    if (audioUrl) {
      audio.src = audioUrl;
      audio.load();
    }
  }, [audioUrl]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.warn("Audio play prevented or error:", err);
          setIsPlaying(false);
        });
    }
  }, [isPlaying]);

  const seek = useCallback((timeInSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const clamped = Math.max(0, Math.min(timeInSeconds, duration || 450));
    audio.currentTime = clamped;
    setCurrentTime(clamped);
  }, [duration]);

  const rewind = useCallback((seconds: number = 5) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, audio.currentTime - seconds);
    audio.currentTime = target;
    setCurrentTime(target);
  }, []);

  const changeSpeed = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

  const changeVolume = useCallback((val: number) => {
    const clamped = Math.max(0, Math.min(1, val));
    setVolume(clamped);
    if (audioRef.current) {
      audioRef.current.volume = clamped;
      if (clamped > 0 && isMuted) {
        audioRef.current.muted = false;
        setIsMuted(false);
      }
    }
  }, [isMuted]);

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
      setCurrentTime(audioRef.current.currentTime);
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      setDuration(Math.round(audioRef.current.duration));
    }
  }, []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration: duration || defaultDuration,
    playbackSpeed,
    isMuted,
    volume,
    togglePlay,
    seek,
    rewind,
    changeSpeed,
    changeVolume,
    toggleMute,
    audioEventHandlers: {
      onTimeUpdate: handleTimeUpdate,
      onLoadedMetadata: handleLoadedMetadata,
      onEnded: handleEnded,
    },
  };
}
