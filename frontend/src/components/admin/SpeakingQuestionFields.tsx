"use client";

import React, { useState } from "react";
import { Upload, Volume2, Loader2 } from "lucide-react";
import { uploadMedia } from "@/services/admin-content";

interface SpeakingQuestionFieldsProps {
  prepTimeSec?: number;
  answerTimeSec?: number;
  promptAudioKey: string;
  onPrepTimeChange: (val: number | undefined) => void;
  onAnswerTimeChange: (val: number | undefined) => void;
  onPromptAudioKeyChange: (val: string) => void;
}

export function SpeakingQuestionFields({
  prepTimeSec,
  answerTimeSec,
  promptAudioKey,
  onPrepTimeChange,
  onAnswerTimeChange,
  onPromptAudioKeyChange,
}: SpeakingQuestionFieldsProps) {
  const [uploading, setUploading] = useState(false);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadMedia(file, "audio/speaking");
      onPromptAudioKeyChange(res.key || res.url);
    } catch (err: any) {
      alert("Lỗi tải file audio lên Cloudflare R2");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-3 text-xs">
      <div className="font-semibold text-zinc-800 flex items-center gap-1.5">
        <Volume2 className="w-4 h-4 text-[#932120]" /> Cấu hình Speaking & Audio Giám Khảo:
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-zinc-600 mb-1">Thời gian chuẩn bị (giây):</label>
          <input
            type="number"
            value={prepTimeSec ?? ""}
            onChange={(e) => onPrepTimeChange(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="VD: 60 (cho Part 2)"
            className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white"
          />
        </div>
        <div>
          <label className="block text-zinc-600 mb-1">Thời gian nói (giây):</label>
          <input
            type="number"
            value={answerTimeSec ?? ""}
            onChange={(e) => onAnswerTimeChange(e.target.value ? parseInt(e.target.value) : undefined)}
            placeholder="VD: 120 (cho Part 2)"
            className="w-full px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white"
          />
        </div>
      </div>

      <div>
        <label className="block text-zinc-600 mb-1">File Audio Giọng Đọc Giám Khảo (R2 Key):</label>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={promptAudioKey}
            onChange={(e) => onPromptAudioKeyChange(e.target.value)}
            placeholder="VD: audio/speaking/examiner_p1_q1.mp3"
            className="flex-1 px-2.5 py-1.5 border border-zinc-300 rounded-lg bg-white font-mono text-[11px]"
          />
          <label className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg font-semibold hover:bg-zinc-100 cursor-pointer flex items-center gap-1 text-zinc-700">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            <span>Upload</span>
            <input type="file" accept="audio/*" onChange={handleAudioUpload} className="hidden" />
          </label>
        </div>
        {promptAudioKey && (
          <audio controls src={promptAudioKey.startsWith("http") ? promptAudioKey : undefined} className="w-full h-8 mt-2" />
        )}
      </div>
    </div>
  );
}
