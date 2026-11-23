"use client";

import React, { useState, useEffect } from "react";
import { X, Loader2, Save } from "lucide-react";
import { createQuestion, updateQuestion } from "@/services/admin-content";
import { SpeakingQuestionFields } from "@/components/admin/SpeakingQuestionFields";
import { QuestionAnswerKeyEditor } from "@/components/admin/QuestionAnswerKeyEditor";
import type { Question, SkillType } from "@/types/exam";

interface QuestionEditorModalProps {
  isOpen: boolean;
  groupId: string;
  skill: SkillType;
  questionType: string;
  questionToEdit?: Question | null;
  nextNumber: number;
  onClose: () => void;
  onSaved: () => void;
}

export function QuestionEditorModal({
  isOpen,
  groupId,
  skill,
  questionType,
  questionToEdit,
  nextNumber,
  onClose,
  onSaved,
}: QuestionEditorModalProps) {
  const [number, setNumber] = useState(nextNumber);
  const [prompt, setPrompt] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [acceptedAnswers, setAcceptedAnswers] = useState("");
  const [evidence, setEvidence] = useState("");
  const [explanation, setExplanation] = useState("");
  const [maxWords, setMaxWords] = useState<number | undefined>(undefined);
  const [prepTimeSec, setPrepTimeSec] = useState<number | undefined>(undefined);
  const [answerTimeSec, setAnswerTimeSec] = useState<number | undefined>(undefined);
  const [promptAudioKey, setPromptAudioKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (questionToEdit) {
      setNumber(questionToEdit.number);
      setPrompt(questionToEdit.prompt || "");
      setOptions(Array.isArray(questionToEdit.options) ? questionToEdit.options.map(String) : []);
      const akRaw = questionToEdit.question_answer_keys;
      const ak = Array.isArray(akRaw) ? akRaw[0] : (akRaw as any);
      setAcceptedAnswers(ak?.accepted_answers?.join(", ") || "");
      setEvidence(ak?.evidence || "");
      setExplanation(ak?.explanation || "");
      setMaxWords(questionToEdit.max_words ?? undefined);
      setPrepTimeSec(questionToEdit.prep_time_sec ?? undefined);
      setAnswerTimeSec(questionToEdit.answer_time_sec ?? undefined);
      setPromptAudioKey(questionToEdit.prompt_audio_key || "");
    } else {
      setNumber(nextNumber);
      setPrompt("");
      setOptions(questionType === "multiple_choice" ? ["A", "B", "C", "D"] : []);
      setAcceptedAnswers("");
      setEvidence("");
      setExplanation("");
      setMaxWords(skill === "writing" ? (questionType.includes("task1") ? 150 : 250) : undefined);
      setPrepTimeSec(skill === "speaking" ? (questionType.includes("part2") ? 60 : 0) : undefined);
      setAnswerTimeSec(skill === "speaking" ? (questionType.includes("part2") ? 120 : 45) : undefined);
      setPromptAudioKey("");
    }
    setError(null);
  }, [questionToEdit, nextNumber, isOpen, questionType, skill]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !questionType.includes("completion")) {
      setError("Vui lòng nhập nội dung câu hỏi");
      return;
    }
    setSaving(true);
    setError(null);

    const answersList = acceptedAnswers.split(",").map((a) => a.trim()).filter(Boolean);
    const payload: any = {
      number: Number(number),
      prompt: prompt.trim() || `Câu hỏi số ${number}`,
      options: options.length > 0 ? options : undefined,
      max_words: maxWords ? Number(maxWords) : undefined,
      prompt_audio_key: promptAudioKey.trim() || undefined,
      prep_time_sec: prepTimeSec !== undefined ? Number(prepTimeSec) : undefined,
      answer_time_sec: answerTimeSec !== undefined ? Number(answerTimeSec) : undefined,
      answer_key: {
        accepted_answers: answersList.length > 0 ? answersList : ["N/A"],
        explanation: explanation.trim() || undefined,
        evidence: evidence.trim() || undefined,
      },
    };

    try {
      if (questionToEdit) {
        await updateQuestion(questionToEdit.id, payload);
      } else {
        await createQuestion(groupId, payload);
      }
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Lỗi khi lưu câu hỏi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-base font-bold text-zinc-900">
              {questionToEdit ? `Chỉnh Sửa Câu Hỏi #${questionToEdit.number}` : `Thêm Câu Hỏi Mới (#${number})`}
            </h3>
            <span className="text-xs text-zinc-500 font-medium uppercase tracking-wider">
              Dạng bài: <strong className="text-[#932120]">{questionType}</strong> • Kỹ năng: <strong>{skill}</strong>
            </span>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 p-1 rounded-lg cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1 text-xs">
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-1">
              <label className="block font-semibold text-zinc-700 mb-1">Số thứ tự (#):</label>
              <input
                type="number"
                min={1}
                required
                value={number}
                onChange={(e) => setNumber(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg font-bold text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#932120]"
              />
            </div>
            <div className="col-span-3">
              <label className="block font-semibold text-zinc-700 mb-1">Nội dung câu hỏi / Câu văn / Yêu cầu:</label>
              <input
                type="text"
                required
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="VD: In paragraph 2, the author suggests that... hoặc Nhãn vị trí cần điền"
                className="w-full px-3 py-2 border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#932120]"
              />
            </div>
          </div>

          {/* Smart Answer Key Editor chuyên biệt cho từng dạng bài */}
          <QuestionAnswerKeyEditor
            skill={skill}
            questionType={questionType}
            prompt={prompt}
            onPromptChange={setPrompt}
            acceptedAnswers={acceptedAnswers}
            onAcceptedAnswersChange={setAcceptedAnswers}
            options={options}
            onOptionsChange={setOptions}
            evidence={evidence}
            onEvidenceChange={setEvidence}
            explanation={explanation}
            onExplanationChange={setExplanation}
            maxWords={maxWords}
            onMaxWordsChange={setMaxWords}
          />

          {skill === "speaking" && (
            <SpeakingQuestionFields
              prepTimeSec={prepTimeSec}
              answerTimeSec={answerTimeSec}
              promptAudioKey={promptAudioKey}
              onPrepTimeChange={setPrepTimeSec}
              onAnswerTimeChange={setAnswerTimeSec}
              onPromptAudioKeyChange={setPromptAudioKey}
            />
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-300 rounded-xl text-zinc-700 font-bold hover:bg-zinc-50 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 bg-[#932120] text-white rounded-xl font-bold hover:bg-[#7a1a19] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{questionToEdit ? "Lưu Thay Đổi" : "Tạo Câu Hỏi"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
