"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { aiServiceErrorMessage, replaceProviderKey } from "@/services/admin-ai-services";
import type { ProviderKeyStatus } from "@/types/admin-ai-services";
import { ModalShell } from "./ModalShell";
import { Notice } from "./Notice";

interface ReplaceKeyModalProps {
  provider: ProviderKeyStatus;
  onClose: () => void;
  onReplaced: (message: string) => void;
}

/** Nhập key mới. Key chỉ nằm trong state đến lúc bấm Lưu: xoá ngay khi gửi, không hiện lại, không ghi log. */
export function ReplaceKeyModal({ provider, onClose, onReplaced }: ReplaceKeyModalProps) {
  const [apiKey, setApiKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const value = apiKey.trim();
    if (value.length < 8 || value.length > 512) {
      setError("API key phải dài từ 8 đến 512 ký tự");
      return;
    }
    setApiKey(""); // xoá khỏi state ngay khi gửi
    setSaving(true);
    setError(null);
    try {
      const result = await replaceProviderKey(provider.provider, value);
      onReplaced(`Đã thay key ${provider.label} (…${result.last4}), áp dụng cho lượt chấm mới trong tối đa 60 giây`);
    } catch (err) {
      setError(aiServiceErrorMessage(err, "Gọi thử thất bại, chưa lưu key") + " Nhập lại key để thử lại.");
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Thay key: ${provider.label}`}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">Huỷ</button>
          <button onClick={handleSave} disabled={saving || apiKey.trim() === ""} className="px-4 py-2 rounded-xl bg-[#932120] text-white text-sm font-bold hover:bg-[#7a1a19] disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Đang gọi thử…" : "Lưu key"}
          </button>
        </>
      }
    >
      <p className="text-xs text-zinc-500">
        Hệ thống gọi thử bằng key mới trước khi lưu; gọi thử lỗi thì không lưu. Key được mã hoá và không bao giờ hiện lại.
      </p>
      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-zinc-700">API key mới</span>
        <input
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          disabled={saving}
          className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#932120]/30 focus:border-[#932120]"
        />
      </label>
      {error && <Notice kind="error">{error}</Notice>}
    </ModalShell>
  );
}
