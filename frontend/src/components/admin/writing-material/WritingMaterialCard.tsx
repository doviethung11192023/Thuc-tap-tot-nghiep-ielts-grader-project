"use client";

import React, { useState } from "react";
import { CheckCircle2, Loader2, Save, Sparkles } from "lucide-react";

// Một loại tài liệu theo đề (đáp án / dàn ý / bài mẫu): AI soạn nháp → Admin sửa → duyệt (spec 006).
// Cha truyền key={value} để ô soạn nạp lại khi bản nháp đổi.
interface WritingMaterialCardProps {
  title: string;
  hint: string;
  value: string;
  reviewedAt: string | null;
  isJson?: boolean;
  draftDisabledReason?: string;
  onDraft: () => Promise<void>;
  onSave: (text: string) => Promise<void>;
  onApprove: () => Promise<void>;
}

export function WritingMaterialCard({
  title, hint, value, reviewedAt, isJson, draftDisabledReason, onDraft, onSave, onApprove,
}: WritingMaterialCardProps) {
  const [text, setText] = useState(value);
  const [busy, setBusy] = useState<"" | "draft" | "save" | "approve">("");
  const [error, setError] = useState("");

  const dirty = text !== value;
  const run = async (kind: "draft" | "save" | "approve", fn: () => Promise<void>) => {
    setBusy(kind);
    setError("");
    try {
      await fn();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e.response?.data?.detail || e.message || "Thao tác thất bại");
    } finally {
      setBusy("");
    }
  };

  const save = () => run("save", async () => {
    if (isJson) JSON.parse(text);           // báo lỗi cú pháp trước khi gửi
    await onSave(text);
  });

  return (
    <div className="p-3 bg-white border border-zinc-200 rounded-xl space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-zinc-800">{title}</p>
          <p className="text-[11px] text-zinc-500">{hint}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
          reviewedAt ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : value ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
          {reviewedAt ? "Đã duyệt" : value ? "Nháp, chưa dùng" : "Chưa có"}
        </span>
      </div>

      <textarea
        rows={isJson ? 12 : 7}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={draftDisabledReason || "Bấm “AI soạn nháp” hoặc tự nhập"}
        className={`w-full p-2.5 border border-zinc-300 rounded-lg text-xs leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#932120] ${isJson ? "font-mono" : ""}`}
      />
      {error && <p className="text-[11px] text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={!!busy || !!draftDisabledReason} title={draftDisabledReason}
          onClick={() => run("draft", onDraft)}
          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-zinc-300 bg-zinc-50 hover:bg-zinc-100 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
          {busy === "draft" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-[#932120]" />}
          AI soạn nháp
        </button>
        <button type="button" disabled={!!busy || !dirty} onClick={save}
          className="px-3 py-1.5 rounded-lg text-xs font-bold border border-zinc-300 hover:bg-zinc-50 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
          {busy === "save" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Lưu nháp
        </button>
        <button type="button" disabled={!!busy || dirty || !value || !!reviewedAt} onClick={() => run("approve", onApprove)}
          title={dirty ? "Lưu trước khi duyệt" : undefined}
          className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#932120] text-white hover:bg-[#7a1a19] disabled:opacity-50 flex items-center gap-1.5 cursor-pointer">
          {busy === "approve" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Duyệt
        </button>
      </div>
    </div>
  );
}
