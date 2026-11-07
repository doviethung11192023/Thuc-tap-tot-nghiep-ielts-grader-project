"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RecordedAnswer } from "@/hooks/useSpeakingRecorder";

/**
 * Một câu hỏi trong ST_speaking_room:
 * asking (phát câu hỏi) → preparing (suy nghĩ / Part 2 chuẩn bị) → recording → finished.
 * Hết giờ thì dừng ghi và sang câu tiếp (BR-13). Thi thử luôn tự chuyển câu.
 */
export type RoomPhase = "idle" | "asking" | "preparing" | "recording" | "finished";

export interface RoomQuestion {
  key: string;
  audioUrl?: string;
  prepSeconds: number;
  answerSeconds: number;
  answered: boolean;
}

interface RoomOptions {
  active: boolean;
  question?: RoomQuestion;
  isMock: boolean;
  startRecording: () => boolean;
  stopRecording: () => Promise<RecordedAnswer | null>;
  discardRecording: () => void;
  onRecorded: (questionKey: string, answer: RecordedAnswer) => void;
  onAdvance: () => void;
  onRecordingFailed: () => void;
}

/** Không có audio câu hỏi thì dành chút thời gian để đọc trên màn hình. */
const READ_SECONDS_WITHOUT_AUDIO = 2;

export function useSpeakingRoomMachine(options: RoomOptions) {
  const { active, question } = options;
  const questionKey = question?.key;
  const [phase, setPhase] = useState<RoomPhase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(0);

  const optionsRef = useRef(options);
  const phaseRef = useRef<RoomPhase>("idle");
  const endsAtRef = useRef(0);
  const onExpireRef = useRef<() => void>(() => {});
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    optionsRef.current = options;
  });

  const enter = useCallback((next: RoomPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  }, []);

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    audioRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
    }
  }, []);

  const countdown = useCallback(
    (seconds: number, onExpire: () => void) => {
      stopTimer();
      endsAtRef.current = Date.now() + seconds * 1000;
      onExpireRef.current = onExpire;
      setSecondsLeft(seconds);
      timerRef.current = setInterval(() => {
        const left = Math.ceil((endsAtRef.current - Date.now()) / 1000);
        setSecondsLeft(Math.max(0, left));
        if (left <= 0) {
          stopTimer();
          onExpireRef.current();
        }
      }, 200);
    },
    [stopTimer],
  );

  const finishRecording = useCallback(
    async (advance: boolean) => {
      if (phaseRef.current !== "recording") return;
      stopTimer();
      const { question: current, stopRecording, onRecorded, onAdvance, isMock } = optionsRef.current;
      enter("finished");
      const answer = await stopRecording();
      if (answer && current) onRecorded(current.key, answer);
      if (advance || isMock) onAdvance();
    },
    [enter, stopTimer],
  );

  const beginRecording = useCallback(() => {
    const current = optionsRef.current;
    if (!current.question) return;
    if (!current.startRecording()) {
      current.onRecordingFailed();
      return;
    }
    enter("recording");
    countdown(current.question.answerSeconds, () => void finishRecording(true));
  }, [countdown, enter, finishRecording]);

  const beginPreparing = useCallback(() => {
    const prep = optionsRef.current.question?.prepSeconds ?? 0;
    if (prep <= 0) return beginRecording();
    enter("preparing");
    countdown(prep, beginRecording);
  }, [beginRecording, countdown, enter]);

  const playPrompt = useCallback(
    (url: string, onDone?: () => void) => {
      stopAudio();
      const audio = new Audio(url);
      audioRef.current = audio;
      const done = () => {
        stopAudio();
        onDone?.();
      };
      audio.onended = done;
      audio.onerror = done;       // link audio hỏng không được làm kẹt phòng thi
      audio.play().catch(done);
    },
    [stopAudio],
  );

  useEffect(() => {
    if (!active || !questionKey) return;
    const current = optionsRef.current.question;
    if (!current) return;
    if (current.answered) {
      enter("finished");
    } else {
      enter("asking");
      if (current.audioUrl) playPrompt(current.audioUrl, beginPreparing);
      else countdown(READ_SECONDS_WITHOUT_AUDIO, beginPreparing);
    }
    return () => {
      stopTimer();
      stopAudio();
      if (phaseRef.current === "recording") optionsRef.current.discardRecording();
      enter("idle");
    };
  }, [active, questionKey, beginPreparing, countdown, enter, playPrompt, stopAudio, stopTimer]);

  const replayPrompt = useCallback(() => {
    const url = optionsRef.current.question?.audioUrl;
    if (url) playPrompt(url);
  }, [playPrompt]);

  const skipPreparation = useCallback(() => {
    if (phaseRef.current !== "preparing") return;
    stopTimer();
    beginRecording();
  }, [beginRecording, stopTimer]);

  const stopManually = useCallback(() => finishRecording(false), [finishRecording]);

  /** Hết giờ cả bài: giữ phần đã nói, không chuyển câu. */
  const stopForDeadline = useCallback(async () => {
    if (phaseRef.current !== "recording") return;
    stopTimer();
    const { question: current, stopRecording, onRecorded } = optionsRef.current;
    enter("finished");
    const answer = await stopRecording();
    if (answer && current) onRecorded(current.key, answer);
  }, [enter, stopTimer]);

  return {
    phase,
    secondsLeft,
    rerecord: beginRecording,
    replayPrompt,
    skipPreparation,
    stopManually,
    stopForDeadline,
  };
}
