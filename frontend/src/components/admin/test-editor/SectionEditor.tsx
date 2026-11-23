"use client";

import React, { useState } from "react";
import { CheckCircle2, Trash2, Plus, Loader2 } from "lucide-react";
import { updateSection, deleteSection, uploadMedia } from "@/services/admin-content";
import { QuestionGroupModal } from "@/components/admin/QuestionGroupModal";
import { QuestionEditorModal } from "@/components/admin/QuestionEditorModal";
import { QuestionGroupItem } from "@/components/admin/QuestionGroupItem";
import { SectionMediaPassageEditor } from "@/components/admin/SectionMediaPassageEditor";
import { WritingTaskMaterialEditor } from "@/components/admin/writing-material/WritingTaskMaterialEditor";
import type { TestSection, SkillType, Question } from "@/types/exam";

interface SectionEditorProps {
  section: TestSection;
  skill: SkillType;
  onRefresh: () => void;
}

export function SectionEditor({ section, skill, onRefresh }: SectionEditorProps) {
  const [title, setTitle] = useState(section.title || "");
  const [passage, setPassage] = useState(section.passage_text || "");
  const [audioKey, setAudioKey] = useState(section.audio_key || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState("");
  const [activeQuestionType, setActiveQuestionType] = useState("multiple_choice");
  const [activeQuestionToEdit, setActiveQuestionToEdit] = useState<Question | null>(null);
  const [activeNextNumber, setActiveNextNumber] = useState(1);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSection(section.id, {
        title: title.trim() || undefined,
        passage_text: passage.trim() || undefined,
        audio_key: audioKey.trim() || undefined,
      });
      alert("Đã lưu nội dung Section!");
      onRefresh();
    } catch (err) {
      alert("Lỗi khi lưu Section");
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const folder = skill === "listening" ? "audio/listening" : skill === "speaking" ? "audio/speaking" : "images/general";
      const uploaded = await uploadMedia(file, folder);
      setAudioKey(uploaded.key || uploaded.url);
      alert("Tải tệp lên Cloudflare R2 thành công!");
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Lỗi khi upload lên Cloudflare R2");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Xóa Section "${section.title}" cùng toàn bộ câu hỏi bên trong?`)) return;
    try {
      await deleteSection(section.id);
      onRefresh();
    } catch (err) {
      alert("Lỗi khi xóa Section");
    }
  };

  const handleOpenAddQuestion = (groupId: string, qType: string, nextNum: number) => {
    setActiveGroupId(groupId);
    setActiveQuestionType(qType);
    setActiveNextNumber(nextNum);
    setActiveQuestionToEdit(null);
    setIsQuestionModalOpen(true);
  };

  const handleOpenEditQuestion = (q: Question, groupId: string, qType: string) => {
    setActiveGroupId(groupId);
    setActiveQuestionType(qType);
    setActiveQuestionToEdit(q);
    setIsQuestionModalOpen(true);
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-[#932120]/10 text-[#932120] font-bold text-xs flex items-center justify-center">
            {section.order_no}
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề phần thi (vd: Reading Passage 1 hoặc Writing Task 1)"
            className="font-bold text-sm text-zinc-900 border-b border-transparent hover:border-zinc-300 focus:border-[#932120] focus:outline-none px-1 min-w-[280px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3.5 py-1.5 bg-[#932120] text-white rounded-lg text-xs font-bold hover:bg-[#7a1a19] transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Lưu Section
          </button>
          <button
            onClick={handleDelete}
            className="p-1.5 text-zinc-400 hover:text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
            title="Xóa section này"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Editor Media & Đoạn văn / Audio */}
      <SectionMediaPassageEditor
        skill={skill}
        audioKey={audioKey}
        onAudioKeyChange={setAudioKey}
        passage={passage}
        onPassageChange={setPassage}
        uploading={uploading}
        onFileUpload={handleFileUpload}
      />

      {skill === "writing" && <WritingTaskMaterialEditor sectionId={section.id} />}

      {/* Question Groups Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-800">
            Danh Sách Nhóm Dạng Bài ({section.question_groups?.length || 0})
          </span>
          <button
            type="button"
            onClick={() => setIsGroupModalOpen(true)}
            className="px-3 py-1.5 bg-zinc-100 text-zinc-800 rounded-lg text-xs font-bold hover:bg-zinc-200 transition-colors flex items-center gap-1.5 border border-zinc-300 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#932120]" /> Thêm Nhóm Dạng Bài
          </button>
        </div>

        {section.question_groups && section.question_groups.length > 0 ? (
          <div className="space-y-3">
            {section.question_groups.map((grp, gIdx) => (
              <QuestionGroupItem
                key={grp.id}
                group={grp}
                groupIndex={gIdx}
                skill={skill}
                onRefresh={onRefresh}
                onAddQuestion={handleOpenAddQuestion}
                onEditQuestion={handleOpenEditQuestion}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 bg-zinc-50 rounded-xl border border-dashed border-zinc-300 text-center text-zinc-400 text-xs">
            Chưa có nhóm dạng bài nào. Bấm <strong>&quot;+ Thêm Nhóm Dạng Bài&quot;</strong> để tạo nhóm câu hỏi và nhập đáp án.
          </div>
        )}
      </div>

      {/* Modals */}
      <QuestionGroupModal
        isOpen={isGroupModalOpen}
        sectionId={section.id}
        skill={skill}
        existingGroupsCount={section.question_groups?.length || 0}
        onClose={() => setIsGroupModalOpen(false)}
        onCreated={() => {
          setIsGroupModalOpen(false);
          onRefresh();
        }}
      />

      <QuestionEditorModal
        isOpen={isQuestionModalOpen}
        groupId={activeGroupId}
        skill={skill}
        questionType={activeQuestionType}
        questionToEdit={activeQuestionToEdit}
        nextNumber={activeNextNumber}
        onClose={() => setIsQuestionModalOpen(false)}
        onSaved={() => {
          setIsQuestionModalOpen(false);
          onRefresh();
        }}
      />
    </div>
  );
}
