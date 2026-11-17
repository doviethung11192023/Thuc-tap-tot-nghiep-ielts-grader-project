"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Volume2, 
  Mic, 
  MapPin, 
  Trash2, 
  Sparkles,
  Clock,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import type { WorkspaceQuestionItem, WorkspaceAnnotation } from "@/types";
import { SpeakingPromptDisplay } from "@/components/exam/speaking/speaking-prompt-card";

interface Props {
  questions: WorkspaceQuestionItem[];
  annotations: WorkspaceAnnotation[];
  onChangeAnnotations: (updated: WorkspaceAnnotation[]) => void;
  activeQuestionIdx: number;
  setActiveQuestionIdx: (idx: number) => void;
}

export default function SpeakingAudioWorkspace({
  questions,
  annotations,
  onChangeAnnotations,
  activeQuestionIdx,
  setActiveQuestionIdx
}: Props) {
  const currentQ = questions[activeQuestionIdx] || questions[0];
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [audioError, setAudioError] = useState<string | null>(null);
  const playableSrc = currentQ?.audio_url || (currentQ?.audio_key?.startsWith("http") ? currentQ.audio_key : null);
  const fallbackDuration = currentQ?.duration_ms ? currentQ.duration_ms / 1000 : 0;
  const effectiveDuration = Number.isFinite(duration) && duration > 0 ? duration : fallbackDuration;

  // Form ghim lỗi âm thanh
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinCategory, setPinCategory] = useState<"P" | "FC" | "LR" | "GRA">("P");
  const [pinExplanation, setPinExplanation] = useState("");
  const [pinCorrected, setPinCorrected] = useState("");

  // Phím tắt Space để Play/Pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && (e.target as HTMLElement).tagName !== "TEXTAREA" && (e.target as HTMLElement).tagName !== "INPUT") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isPlaying]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, playableSrc]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const ct = audioRef.current.currentTime;
      setCurrentTime(ct);
      if ((!Number.isFinite(duration) || duration <= 0) && Number.isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (Number.isFinite(d) && d > 0) {
        setDuration(d);
      } else if (fallbackDuration > 0) {
        setDuration(fallbackDuration);
      }
    }
  };

  const handleSeek = (sec: number) => {
    if (audioRef.current && Number.isFinite(sec)) {
      audioRef.current.currentTime = sec;
      setCurrentTime(sec);
    }
  };

  const formatSec = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds < 0) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Add Audio Pin Annotation
  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQ) return;

    const currentMs = Math.round(currentTime * 1000);
    const newAnn: WorkspaceAnnotation = {
      id: `ann-audio-${Date.now()}`,
      type: "error",
      category: pinCategory,
      title: `${pinCategory}: Lỗi âm thanh tại ${formatSec(currentTime)}`,
      original_text: `Tại giây ${formatSec(currentTime)}`,
      corrected_text: pinCorrected.trim() || null,
      explanation: pinExplanation.trim() || `Nhận xét mốc ${formatSec(currentTime)}`,
      response_id: currentQ.response_id,
      start_ms: currentMs,
      end_ms: currentMs + 1000
    };

    onChangeAnnotations([...annotations, newAnn]);
    setShowPinForm(false);
    setPinExplanation("");
    setPinCorrected("");
  };

  const handleDeleteAnnotation = (id?: string) => {
    if (!id) return;
    onChangeAnnotations(annotations.filter(a => a.id !== id));
  };

  // Lọc annotations thuộc câu hỏi hiện tại
  const qAnnotations = annotations.filter(a => a.response_id === currentQ?.response_id);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs flex flex-col h-full overflow-hidden">
      {/* Question Selector Bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-zinc-200 bg-zinc-50/50 overflow-x-auto">
        {questions.map((q, idx) => (
          <button
            key={q.response_id}
            onClick={() => {
              setActiveQuestionIdx(idx);
              setIsPlaying(false);
              setCurrentTime(0);
              setDuration(0);
              setAudioError(null);
              setShowPinForm(false);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
              activeQuestionIdx === idx
                ? "bg-[#932120] text-white shadow-xs"
                : "bg-white text-zinc-600 hover:text-zinc-900 border border-zinc-200"
            }`}
          >
            <Mic className="w-3 h-3" />
            {q.part_number ? `Part ${q.part_number} · Câu ${q.order_no}` : `Câu ${q.order_no}`}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Question Prompt */}
        <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-4 space-y-2">
          <span className="text-[11px] uppercase tracking-wider font-bold text-zinc-500">
            {currentQ?.part_number ? `Part ${currentQ.part_number} · Câu hỏi ${currentQ.order_no}` : `Câu hỏi ${currentQ?.order_no}`}
          </span>
          {currentQ?.prompt && (
            <SpeakingPromptDisplay part={currentQ.part_number ?? 1} prompt={currentQ.prompt} compact />
          )}
        </div>

        {/* Audio Player & Waveform Timeline */}
        <div className="bg-white border border-zinc-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-[#932120]" />
              Bản ghi âm thí sinh <span className="hidden sm:inline text-zinc-400 font-medium">(Nhấn [Space] để Dừng / Phát)</span>
            </span>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 border border-zinc-200">
              {formatSec(currentTime)} / {formatSec(effectiveDuration)}
            </span>
          </div>

          {playableSrc ? (
            <audio
              ref={audioRef}
              src={playableSrc}
              preload="metadata"
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                setAudioError(null);
                handleLoadedMetadata();
              }}
              onDurationChange={handleLoadedMetadata}
              onError={() => setAudioError("Không tải được file audio. Vui lòng thử tải lại trang.")}
              onEnded={() => setIsPlaying(false)}
            />
          ) : (
            <div className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {currentQ?.audio_deleted ? "File audio đã hết hạn lưu trữ." : "Không tìm thấy đường dẫn audio hợp lệ cho câu hỏi này."}
            </div>
          )}
          {audioError && (
            <div className="text-xs text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {audioError}
            </div>
          )}

          {/* Interactive Timeline Scrub Bar with Pins */}
          <div className="pt-2 pb-1">
            <div className="relative w-full h-9 flex items-center group">
              <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden relative shadow-inner">
                <div
                  className="h-full bg-gradient-to-r from-[#932120] to-rose-500 rounded-full transition-[width] duration-75"
                  style={{
                    width: `${effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0}%`,
                  }}
                />
              </div>

              {/* Thumb indicator */}
              <div
                className="pointer-events-none absolute top-1/2 -translate-y-1/2 -ml-2 w-4 h-4 rounded-full bg-white border-2 border-[#932120] shadow-md transition-transform group-hover:scale-110"
                style={{
                  left: `${effectiveDuration > 0 ? Math.min(100, Math.max(0, (currentTime / effectiveDuration) * 100)) : 0}%`,
                }}
              />

              <input
                type="range"
                aria-label="Thanh tua audio bài nói"
                min={0}
                max={effectiveDuration > 0 ? effectiveDuration : 1}
                step={0.05}
                disabled={effectiveDuration <= 0}
                value={effectiveDuration > 0 ? Math.min(currentTime, effectiveDuration) : 0}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />

              {/* Pins placed along the timeline */}
              {effectiveDuration > 0 && qAnnotations.map((ann, i) => {
                const sec = (ann.start_ms || 0) / 1000;
                const pct = Math.min(100, Math.max(0, (sec / effectiveDuration) * 100));
                return (
                  <button
                    key={ann.id || i}
                    type="button"
                    onClick={() => handleSeek(sec)}
                    style={{ left: `${pct}%` }}
                    className="absolute -top-2 -ml-2.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:scale-125 transition-transform z-10 cursor-pointer"
                    title={`${ann.category} tại ${formatSec(sec)}: ${ann.explanation}`}
                  >
                    <MapPin className="w-3 h-3" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Player Controls & Pin Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                aria-label={isPlaying ? "Tạm dừng audio" : "Phát audio"}
                className="w-10 h-10 rounded-full bg-[#932120] text-white flex items-center justify-center hover:bg-[#7a1a19] shadow-xs transition-colors cursor-pointer"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => handleSeek(0)}
                className="p-2 text-zinc-500 hover:text-zinc-800 rounded-lg hover:bg-zinc-100 transition-colors cursor-pointer"
                title="Nghe lại từ đầu"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 ml-1 bg-zinc-100 p-1 rounded-xl border border-zinc-200">
                {[1, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    type="button"
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      playbackRate === rate
                        ? "bg-white text-[#932120] shadow-2xs"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (audioRef.current) audioRef.current.pause();
                setIsPlaying(false);
                setShowPinForm(true);
              }}
              className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-[#932120] border border-red-200 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-2xs"
            >
              <MapPin className="w-3.5 h-3.5" />
              Ghim lỗi tại {formatSec(currentTime)}
            </button>
          </div>
        </div>

        {/* Pin Creation Form Modal */}
        {showPinForm && (
          <div className="p-4 bg-red-50/40 border border-red-200 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#932120]" />
                Thêm nhận xét âm thanh tại mốc: <span className="font-mono text-[#932120]">{formatSec(currentTime)}</span>
              </span>
              <button
                type="button"
                onClick={() => setShowPinForm(false)}
                className="text-xs text-zinc-400 hover:text-zinc-600"
              >
                Đóng
              </button>
            </div>

            <form onSubmit={handleSavePin} className="space-y-3">
              <div className="flex gap-2">
                {(["P", "FC", "LR", "GRA"] as const).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPinCategory(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${
                      pinCategory === cat
                        ? "bg-[#932120] text-white border-[#932120]"
                        : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    {cat === "P" ? "P (Phát âm)" : cat === "FC" ? "FC (Trôi chảy)" : cat}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Gợi ý phát âm / sửa từ:</label>
                <input
                  type="text"
                  value={pinCorrected}
                  onChange={(e) => setPinCorrected(e.target.value)}
                  placeholder="Ví dụ: Âm /θ/ đặt lưỡi giữa hai hàm răng, không đọc thành /s/"
                  className="w-full text-xs p-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#932120]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-700 mb-1">Chi tiết nhận xét:</label>
                <textarea
                  value={pinExplanation}
                  onChange={(e) => setPinExplanation(e.target.value)}
                  rows={2}
                  required
                  placeholder="Ví dụ: Thí sinh nuốt âm đuôi và ngập ngừng lâu..."
                  className="w-full text-xs p-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#932120]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinForm(false)}
                  className="px-3 py-1.5 text-xs text-zinc-600 hover:bg-zinc-100 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 bg-[#932120] text-white text-xs font-bold rounded-lg hover:bg-[#7a1a19] shadow-xs"
                >
                  Lưu ghim âm thanh
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Transcript Box */}
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-zinc-800">Bản phiên âm văn bản (AI Speech-to-Text):</span>
          <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs leading-relaxed text-zinc-700 font-medium">
            {currentQ?.transcript || <span className="italic text-zinc-400">Không có văn bản phiên âm</span>}
          </div>
        </div>

        {/* List of Pinned Annotations */}
        <div className="space-y-3 pt-2">
          <h3 className="text-xs font-bold text-zinc-900">
            Các mốc lỗi đã ghim ({qAnnotations.length})
          </h3>

          {qAnnotations.length === 0 ? (
            <div className="p-4 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400">
              Chưa có mốc lỗi âm thanh nào được ghim. Bấm "Ghim lỗi tại mốc này" khi nghe phát âm sai.
            </div>
          ) : (
            <div className="space-y-2">
              {qAnnotations.map((ann, i) => (
                <div
                  key={ann.id || i}
                  className="p-3 bg-red-50/30 border border-red-200 rounded-xl flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSeek((ann.start_ms || 0) / 1000)}
                        className="px-2 py-0.5 rounded font-mono font-bold text-[11px] bg-red-100 text-[#932120] hover:bg-red-200 transition-colors flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        {formatSec((ann.start_ms || 0) / 1000)}
                      </button>
                      <span className="px-1.5 py-0.5 rounded font-bold text-[10px] bg-white text-zinc-800 border border-zinc-200">
                        {ann.category}
                      </span>
                      {ann.corrected_text && (
                        <span className="font-bold text-emerald-800">
                          {ann.corrected_text}
                        </span>
                      )}
                    </div>
                    <p className="text-zinc-600 leading-relaxed">{ann.explanation}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeleteAnnotation(ann.id)}
                    aria-label="Xóa ghim nhận xét"
                    className="text-zinc-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
