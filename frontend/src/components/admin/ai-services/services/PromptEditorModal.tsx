"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { aiServiceErrorMessage, createPromptVersion } from "@/services/admin-ai-services";
import type { PromptDetail, PromptMessage } from "@/types/admin-ai-services";
import { ModalShell } from "./ModalShell";
import { Notice } from "./Notice";
import { extractVariables, parseConfigJson } from "./prompt-helpers";

interface PromptEditorModalProps {
  base: PromptDetail; // phiên bản đang xem, dùng làm điểm xuất phát
  requiredVariables: string[];
  onClose: () => void;
  onCreated: (version: number) => void;
}

const FIELD = "w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/30 focus:border-[#932120]";

/** Soạn phiên bản mới từ một phiên bản có sẵn. Phiên bản mới chưa có label nên chưa ảnh hưởng chấm bài. */
export function PromptEditorModal({ base, requiredVariables, onClose, onCreated }: PromptEditorModalProps) {
  const [messages, setMessages] = useState<PromptMessage[]>(base.prompt.map((m) => ({ ...m })));
  const [configText, setConfigText] = useState(JSON.stringify(base.config, null, 2));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const configParse = useMemo(() => parseConfigJson(configText), [configText]);
  const missing = useMemo(() => {
    const present = extractVariables(messages);
    return requiredVariables.filter((v) => !present.has(v));
  }, [messages, requiredVariables]);

  const update = (index: number, patch: Partial<PromptMessage>) =>
    setMessages((prev) => prev.map((m, i) => (i === index ? { ...m, ...patch } : m)));

  const handleSave = async () => {
    if (!configParse.ok) {
      setError(configParse.error);
      return;
    }
    if (messages.length === 0 || messages.some((m) => m.content.trim() === "")) {
      setError("Mỗi message phải có nội dung");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createPromptVersion({ name: base.name, prompt: messages, config: configParse.value });
      onCreated(created.version);
    } catch (err) {
      setError(aiServiceErrorMessage(err, "Không tạo được phiên bản mới"));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Sửa thành phiên bản mới: ${base.name}`}
      wide
      busy={saving}
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">Huỷ</button>
          <button onClick={handleSave} disabled={saving || !configParse.ok} className="px-4 py-2 rounded-xl bg-[#932120] text-white text-sm font-bold hover:bg-[#7a1a19] disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Đang lưu…" : "Lưu phiên bản mới"}
          </button>
        </>
      }
    >
      <p className="text-xs text-zinc-500">
        Xuất phát từ phiên bản v{base.version}. Phiên bản mới chưa chạy: bạn cần &quot;Đặt làm production&quot; để chấm bài dùng nó.
      </p>

      {requiredVariables.length > 0 && (
        <div className="text-xs text-zinc-700">
          <span className="font-bold">Biến bắt buộc: </span>
          {requiredVariables.map((v) => (
            <code key={v} className={`mr-1.5 px-1.5 py-0.5 rounded ${missing.includes(v) ? "bg-red-100 text-red-700" : "bg-zinc-100"}`}>{`{{${v}}}`}</code>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <Notice kind="warning">Nội dung đang thiếu biến: {missing.map((v) => `{{${v}}}`).join(", ")}. Hệ thống sẽ từ chối nếu thiếu.</Notice>
      )}

      {messages.map((m, i) => (
        <div key={i} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <select value={m.role} onChange={(e) => update(i, { role: e.target.value })} disabled={saving} className="px-2 py-1.5 rounded-lg border border-zinc-300 text-xs font-bold">
              <option value="system">system</option>
              <option value="user">user</option>
              <option value="assistant">assistant</option>
            </select>
            <span className="text-xs text-zinc-400">Message {i + 1}</span>
            {messages.length > 1 && (
              <button onClick={() => setMessages((prev) => prev.filter((_, j) => j !== i))} disabled={saving} className="ml-auto p-1.5 text-red-600 hover:bg-red-50 rounded-lg" aria-label="Xoá message">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <textarea value={m.content} onChange={(e) => update(i, { content: e.target.value })} disabled={saving} rows={10} spellCheck={false} className={`${FIELD} font-mono text-xs`} />
        </div>
      ))}
      <button onClick={() => setMessages((prev) => [...prev, { role: "user", content: "" }])} disabled={saving} className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-1.5">
        <Plus className="w-3.5 h-3.5" /> Thêm message
      </button>

      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-zinc-700">Config (JSON)</span>
        <textarea value={configText} onChange={(e) => setConfigText(e.target.value)} disabled={saving} rows={6} spellCheck={false} className={`${FIELD} font-mono text-xs`} />
        {!configParse.ok && <span className="text-xs text-red-700 font-medium">{configParse.error}</span>}
      </label>

      {error && <Notice kind="error">{error}</Notice>}
    </ModalShell>
  );
}
