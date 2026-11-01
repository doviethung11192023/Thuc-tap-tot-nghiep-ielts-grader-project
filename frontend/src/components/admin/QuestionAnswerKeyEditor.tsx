"use client";

import React from "react";
import type { SkillType } from "@/types/exam";
import { TrueFalseAnswerEditor } from "./answer-editors/TrueFalseAnswerEditor";
import { MultipleChoiceAnswerEditor } from "./answer-editors/MultipleChoiceAnswerEditor";
import { CompletionSmartBuilder } from "./answer-editors/CompletionSmartBuilder";
import { MatchingHeadingsEditor } from "./answer-editors/MatchingHeadingsEditor";
import { WritingModelAnswerEditor } from "./answer-editors/WritingModelAnswerEditor";
import { SpeakingCueCardEditor } from "./answer-editors/SpeakingCueCardEditor";

interface QuestionAnswerKeyEditorProps {
  skill: SkillType;
  questionType: string;
  prompt: string;
  onPromptChange: (val: string) => void;
  acceptedAnswers: string;
  onAcceptedAnswersChange: (val: string) => void;
  options: string[];
  onOptionsChange: (options: string[]) => void;
  evidence: string;
  onEvidenceChange: (val: string) => void;
  explanation: string;
  onExplanationChange: (val: string) => void;
  maxWords?: number;
  onMaxWordsChange?: (val: number | undefined) => void;
}

export function QuestionAnswerKeyEditor({
  skill,
  questionType,
  prompt,
  onPromptChange,
  acceptedAnswers,
  onAcceptedAnswersChange,
  options,
  onOptionsChange,
  evidence,
  onEvidenceChange,
  explanation,
  onExplanationChange,
  maxWords,
  onMaxWordsChange,
}: QuestionAnswerKeyEditorProps) {
  const qType = questionType.toLowerCase();

  // 1. Dạng True / False / Not Given & Yes / No / Not Given
  if (qType.includes("true_false") || qType.includes("tfng") || qType.includes("yes_no")) {
    return (
      <TrueFalseAnswerEditor
        acceptedAnswers={acceptedAnswers}
        onAcceptedAnswersChange={onAcceptedAnswersChange}
        evidence={evidence}
        onEvidenceChange={onEvidenceChange}
        explanation={explanation}
        onExplanationChange={onExplanationChange}
        isYesNo={qType.includes("yes_no")}
      />
    );
  }

  // 2. Dạng Multiple Choice (Trắc nghiệm)
  if (qType === "multiple_choice") {
    return (
      <MultipleChoiceAnswerEditor
        options={options.length > 0 ? options : ["A", "B", "C", "D"]}
        onOptionsChange={onOptionsChange}
        acceptedAnswers={acceptedAnswers}
        onAcceptedAnswersChange={onAcceptedAnswersChange}
        evidence={evidence}
        onEvidenceChange={onEvidenceChange}
        explanation={explanation}
        onExplanationChange={onExplanationChange}
      />
    );
  }

  // 3. Dạng Completion (Sentence / Form / Notes / Table Completion)
  if (qType.includes("completion") || qType === "short_answer") {
    return (
      <CompletionSmartBuilder
        prompt={prompt}
        onPromptChange={onPromptChange}
        acceptedAnswers={acceptedAnswers}
        onAcceptedAnswersChange={onAcceptedAnswersChange}
        maxWords={maxWords}
        onMaxWordsChange={onMaxWordsChange || (() => {})}
        evidence={evidence}
        onEvidenceChange={onEvidenceChange}
        explanation={explanation}
        onExplanationChange={onExplanationChange}
      />
    );
  }

  // 4. Dạng Matching Headings / Information
  if (qType.includes("matching")) {
    return (
      <MatchingHeadingsEditor
        acceptedAnswers={acceptedAnswers}
        onAcceptedAnswersChange={onAcceptedAnswersChange}
        options={options.length > 0 ? options : ["i", "ii", "iii", "iv", "v"]}
        onOptionsChange={onOptionsChange}
        evidence={evidence}
        onEvidenceChange={onEvidenceChange}
        explanation={explanation}
        onExplanationChange={onExplanationChange}
      />
    );
  }

  // 5. Kỹ năng Writing (Task 1 & Task 2)
  if (skill === "writing" || qType.includes("writing")) {
    return (
      <WritingModelAnswerEditor
        explanation={explanation}
        onExplanationChange={onExplanationChange}
        evidence={evidence}
        onEvidenceChange={onEvidenceChange}
        onAcceptedAnswersChange={onAcceptedAnswersChange}
        taskType={qType.includes("task1") ? "task1" : "task2"}
      />
    );
  }

  // 6. Kỹ năng Speaking (Part 1, 2, 3)
  if (skill === "speaking" || qType.includes("speaking")) {
    return (
      <SpeakingCueCardEditor
        partType={qType}
        explanation={explanation}
        onExplanationChange={onExplanationChange}
        evidence={evidence}
        onEvidenceChange={onEvidenceChange}
        onAcceptedAnswersChange={onAcceptedAnswersChange}
        options={options}
        onOptionsChange={onOptionsChange}
      />
    );
  }

  // 7. Fallback mặc định
  return (
    <div className="space-y-3 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
      <div>
        <label className="block font-semibold text-zinc-700 mb-1">
          Đáp án chấp nhận (các đáp án cách nhau bằng dấu phẩy):
        </label>
        <input
          type="text"
          value={acceptedAnswers}
          onChange={(e) => onAcceptedAnswersChange(e.target.value)}
          placeholder="VD: A hoặc TRUE hoặc fresh water"
          className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#932120] font-medium text-emerald-800"
        />
      </div>

      <div>
        <label className="block font-semibold text-zinc-700 mb-1">Đoạn dẫn chứng (Evidence):</label>
        <textarea
          rows={2}
          value={evidence}
          onChange={(e) => onEvidenceChange(e.target.value)}
          placeholder="Trích dẫn câu văn chứng minh đáp án..."
          className="w-full p-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#932120]"
        />
      </div>

      <div>
        <label className="block font-semibold text-zinc-700 mb-1">Lời giải chi tiết 4 bước:</label>
        <textarea
          rows={3}
          value={explanation}
          onChange={(e) => onExplanationChange(e.target.value)}
          placeholder="B1... B2... B3... B4..."
          className="w-full p-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#932120] font-mono text-[11px]"
        />
      </div>
    </div>
  );
}
