"use client";

import React from "react";
import { Upload, Volume2, FileText, Loader2, PenTool, Mic } from "lucide-react";
import type { SkillType } from "@/types/exam";

interface SectionMediaPassageEditorProps {
  skill: SkillType;
  audioKey: string;
  onAudioKeyChange: (val: string) => void;
  passage: string;
  onPassageChange: (val: string) => void;
  uploading: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function SectionMediaPassageEditor({
  skill,
  audioKey,
  onAudioKeyChange,
  passage,
  onPassageChange,
  uploading,
  onFileUpload,
}: SectionMediaPassageEditorProps) {
  return (
    <div className="space-y-4">
      {/* Audio upload cho Listening & Speaking */}
      {(skill === "listening" || skill === "speaking") && (
        <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-xs">
          <label className="font-semibold text-zinc-700 flex items-center gap-1.5">
            {skill === "listening" ? (
              <Volume2 className="w-4 h-4 text-[#932120]" />
            ) : (
              <Mic className="w-4 h-4 text-[#932120]" />
            )}
            {skill === "listening"
              ? "File Audio Nghe (Cloudflare R2 Key / URL):"
              : "Audio Lời Dẫn Giám Khảo Section (R2 Key / URL):"}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={audioKey}
              onChange={(e) => onAudioKeyChange(e.target.value)}
              placeholder="VD: audio/listening/cam19_test1_sec1.mp3"
              className="flex-1 px-3 py-1.5 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#932120] font-mono text-[11px]"
            />
            <label className="px-3 py-1.5 bg-white border border-zinc-300 rounded-lg font-semibold text-zinc-700 hover:bg-zinc-100 cursor-pointer flex items-center gap-1.5 shadow-2xs">
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Upload R2</span>
              <input type="file" accept="audio/*" onChange={onFileUpload} className="hidden" />
            </label>
          </div>
          {audioKey && (
            <audio controls src={audioKey.startsWith("http") ? audioKey : undefined} className="w-full h-8 mt-2" />
          )}
        </div>
      )}

      {/* Reading Passage hoặc Writing Prompt hoặc Speaking Cue Card */}
      {(skill === "reading" || skill === "writing" || skill === "speaking") && (
        <div className="space-y-1.5 text-xs">
          <label className="font-semibold text-zinc-700 flex items-center gap-1.5">
            {skill === "writing" ? (
              <PenTool className="w-4 h-4 text-[#932120]" />
            ) : (
              <FileText className="w-4 h-4 text-[#932120]" />
            )}
            {skill === "reading"
              ? "Nội dung Đoạn văn (Reading Passage):"
              : skill === "writing"
              ? "Đề bài Task (Writing Prompt & Yêu cầu đề thi):"
              : "Chủ đề / Yêu cầu chung phần thi (Speaking Topic Intro):"}
          </label>
          <textarea
            rows={skill === "reading" ? 8 : 4}
            value={passage}
            onChange={(e) => onPassageChange(e.target.value)}
            placeholder={
              skill === "reading"
                ? "Dán toàn bộ nội dung bài đọc Reading tại đây..."
                : skill === "writing"
                ? "VD: The chart below shows the percentage of households... Write at least 150 words."
                : "VD: Part 2: Describe something you own which is very important to you..."
            }
            className="w-full p-3 border border-zinc-300 rounded-xl font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#932120] text-xs"
          />
        </div>
      )}
    </div>
  );
}
