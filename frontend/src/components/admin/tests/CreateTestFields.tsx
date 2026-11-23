"use client";

import React from "react";
import type { SkillType, AllowedMode, TestDifficulty, TestSet } from "@/types/exam";

interface CreateTestFieldsProps {
  skill: SkillType;
  onSkillChange: (skill: SkillType) => void;
  durationMin: number;
  onDurationChange: (min: number) => void;
  title: string;
  onTitleChange: (title: string) => void;
  placeholder: string;
  difficulty: TestDifficulty;
  onDifficultyChange: (diff: TestDifficulty) => void;
  allowedMode: AllowedMode;
  onAllowedModeChange: (mode: AllowedMode) => void;
  testSetId: string;
  onTestSetIdChange: (setId: string) => void;
  testSets: TestSet[];
}

export function CreateTestFields({
  skill,
  onSkillChange,
  durationMin,
  onDurationChange,
  title,
  onTitleChange,
  placeholder,
  difficulty,
  onDifficultyChange,
  allowedMode,
  onAllowedModeChange,
  testSetId,
  onTestSetIdChange,
  testSets,
}: CreateTestFieldsProps) {
  return (
    <div className="space-y-3.5">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">Kỹ năng thi:</label>
          <select
            value={skill}
            onChange={(e) => onSkillChange(e.target.value as SkillType)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#932120] font-semibold text-zinc-800"
          >
            <option value="reading">Reading (Đọc)</option>
            <option value="listening">Listening (Nghe)</option>
            <option value="writing">Writing (Viết)</option>
            <option value="speaking">Speaking (Nói)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">Thời gian (phút):</label>
          <input
            type="number"
            min={1}
            max={180}
            value={durationMin}
            onChange={(e) => onDurationChange(parseInt(e.target.value) || 60)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 mb-1">Tiêu đề bài thi:</label>
        <input
          type="text"
          required
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">Mức độ khó:</label>
          <select
            value={difficulty}
            onChange={(e) => onDifficultyChange(e.target.value as TestDifficulty)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#932120]"
          >
            <option value="easy">Dễ (Easy)</option>
            <option value="medium">Vừa (Medium)</option>
            <option value="hard">Khó (Hard)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-zinc-700 mb-1">Chế độ cho phép:</label>
          <select
            value={allowedMode}
            onChange={(e) => onAllowedModeChange(e.target.value as AllowedMode)}
            className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-[#932120]"
          >
            <option value="both">Cả hai (Both)</option>
            <option value="practice">Luyện tập</option>
            <option value="mock">Thi thử</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-zinc-700 mb-1">Thuộc Bộ Đề Thi (Tùy chọn):</label>
        <select
          value={testSetId}
          onChange={(e) => onTestSetIdChange(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#932120]"
        >
          <option value="">-- Không phân loại --</option>
          {testSets.map((ts) => (
            <option key={ts.id} value={ts.id}>{ts.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
