"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIME_CANDIDATES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm", "audio/mp4"];

/**
 * Tắt xử lý âm thanh của trình duyệt: khử ồn, tự cân âm lượng và khử vọng làm biến dạng
 * chính tín hiệu mà lớp phân tích phát âm và độ trôi chảy cần đo.
 */
const RAW_AUDIO: MediaTrackConstraints = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
  channelCount: 1,
};

export interface RecordedAnswer {
  blob: Blob;
  durationMs: number;
  mimeType: string;
}

export function pickRecordingMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  return MIME_CANDIDATES.find((mime) => MediaRecorder.isTypeSupported(mime)) ?? null;
}

function micErrorMessage(err: unknown): string {
  const name = (err as DOMException)?.name;
  if (name === "NotAllowedError") return "Trình duyệt đang chặn micro. Hãy cho phép micro rồi thử lại.";
  if (name === "NotFoundError") return "Không tìm thấy micro trên thiết bị này.";
  return "Không mở được micro. Hãy kiểm tra thiết bị rồi thử lại.";
}

export function useSpeakingRecorder(onMicLost?: () => void) {
  const [micError, setMicError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const onMicLostRef = useRef(onMicLost);

  useEffect(() => {
    onMicLostRef.current = onMicLost;
  }, [onMicLost]);

  const requestMic = useCallback(async (): Promise<boolean> => {
    if (streamRef.current?.active) return true;
    if (!navigator.mediaDevices?.getUserMedia || !pickRecordingMime()) {
      setMicError("Trình duyệt này không hỗ trợ ghi âm. Hãy dùng Chrome, Edge hoặc Firefox bản mới.");
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: RAW_AUDIO });
      stream.getAudioTracks()[0]?.addEventListener("ended", () => onMicLostRef.current?.());
      const context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      context.createMediaStreamSource(stream).connect(analyser);
      streamRef.current = stream;
      contextRef.current = context;
      analyserRef.current = analyser;
      setMicError(null);
      return true;
    } catch (err) {
      setMicError(micErrorMessage(err));
      return false;
    }
  }, []);

  /** Âm lượng RMS hiện tại, 0 đến 1. */
  const getLevel = useCallback((): number => {
    const analyser = analyserRef.current;
    if (!analyser) return 0;
    const samples = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(samples);
    return Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
  }, []);

  const start = useCallback((): boolean => {
    const stream = streamRef.current;
    const mimeType = pickRecordingMime();
    if (!stream?.active || !mimeType) return false;
    const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128_000 });
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorderRef.current = recorder;
    startedAtRef.current = performance.now();
    recorder.start(1000);
    return true;
  }, []);

  const finish = useCallback((keep: boolean): Promise<RecordedAnswer | null> => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder || recorder.state === "inactive") return Promise.resolve(null);
    const durationMs = performance.now() - startedAtRef.current;
    return new Promise((resolve) => {
      recorder.onstop = () => {
        const chunks = chunksRef.current;
        if (!keep || chunks.length === 0) return resolve(null);
        resolve({ blob: new Blob(chunks, { type: recorder.mimeType }), durationMs, mimeType: recorder.mimeType });
      };
      recorder.stop();
    });
  }, []);

  const stop = useCallback(() => finish(true), [finish]);
  const discard = useCallback(() => void finish(false), [finish]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      void contextRef.current?.close();
    };
  }, []);

  return { micError, requestMic, getLevel, start, stop, discard };
}
