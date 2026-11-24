"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  approveWritingMaterial, draftWritingMaterial, getWritingMaterial, saveWritingMaterial,
  type MaterialKind, type WritingTaskMaterial,
} from "@/services/admin-writing-materials";
import { WritingMaterialCard } from "./WritingMaterialCard";

// Tài liệu theo đề Writing (spec 006, ADR-30). Chỉ phần đã duyệt mới được dùng để chấm hoặc hiện cho Learner.
export function WritingTaskMaterialEditor({ sectionId }: { sectionId: string }) {
  const [material, setMaterial] = useState<WritingTaskMaterial | null>(null);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getWritingMaterial(sectionId)
      .then(setMaterial)
      .catch(() => setLoadError("Chưa tải được tài liệu theo đề (task chưa có đề bài?)"));
  }, [sectionId]);

  if (loadError) return <p className="text-[11px] text-zinc-500">{loadError}</p>;
  if (!material) return <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />;

  const isTask1 = material.task_type === "task1";
  const keyApproved = !!material.answer_key_reviewed_at;
  const needsKey = isTask1 && !keyApproved ? "Task 1: duyệt đáp án trước, dàn ý và bài mẫu soạn từ đáp án" : undefined;
  const actions = (kind: MaterialKind) => ({
    onDraft: async () => setMaterial(await draftWritingMaterial(sectionId, kind)),
    onApprove: async () => setMaterial(await approveWritingMaterial(sectionId, kind)),
  });

  return (
    <div className="space-y-3 p-3 bg-zinc-50 border border-zinc-200 rounded-xl">
      <p className="text-xs font-bold text-zinc-800">
        Tài liệu theo đề (AI soạn nháp, Admin duyệt; chưa duyệt thì không dùng)
      </p>
      {isTask1 && (
        <WritingMaterialCard
          title="Đáp án số liệu Task 1"
          hint="Số liệu từng chuỗi, ý overview, điểm nổi bật. Đã duyệt thì lúc chấm dùng đáp án này thay cho đọc ảnh."
          key={`key-${material.answer_key_reviewed_at}-${JSON.stringify(material.answer_key)}`}
          value={material.answer_key ? JSON.stringify(material.answer_key, null, 2) : ""}
          reviewedAt={material.answer_key_reviewed_at}
          isJson
          onSave={async (text) => setMaterial(await saveWritingMaterial(sectionId, { answer_key: JSON.parse(text) }))}
          {...actions("answer_key")}
        />
      )}
      <WritingMaterialCard
        title="Dàn ý gợi ý"
        hint="Hiện cho Learner khi làm Practice (không hiện ở Mock)."
        key={`outline-${material.outline}`}
        value={material.outline || ""}
        reviewedAt={material.outline_reviewed_at}
        draftDisabledReason={needsKey}
        onSave={async (text) => setMaterial(await saveWritingMaterial(sectionId, { outline: text }))}
        {...actions("outline")}
      />
      <WritingMaterialCard
        title="Bài mẫu Band 8+"
        hint="Hiện ở trang kết quả sau khi chấm."
        key={`sample-${material.sample_essay}`}
        value={material.sample_essay || ""}
        reviewedAt={material.sample_reviewed_at}
        draftDisabledReason={needsKey}
        onSave={async (text) => setMaterial(await saveWritingMaterial(sectionId, { sample_essay: text }))}
        {...actions("sample")}
      />
    </div>
  );
}
