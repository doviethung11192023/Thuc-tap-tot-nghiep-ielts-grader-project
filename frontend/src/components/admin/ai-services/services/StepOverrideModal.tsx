"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { aiServiceErrorMessage, saveStepOverride } from "@/services/admin-ai-services";
import type { RuntimeStepView } from "@/types/admin-ai-services";
import { ModalShell } from "./ModalShell";
import { Notice } from "./Notice";
import { numberToText, parseOptionalNumber, SAVED_MESSAGE } from "./override-form-utils";

interface StepOverrideModalProps {
  step: RuntimeStepView;
  allowedModels: string[];
  onClose: () => void;
  onSaved: (message: string) => void;
}

const INPUT = "w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/30 focus:border-[#932120]";

/** Sửa ghi đè model/temperature/max_tokens của một bước. Để trống = không ghi đè trường đó. */
export function StepOverrideModal({ step, allowedModels, onClose, onSaved }: StepOverrideModalProps) {
  const [model, setModel] = useState(step.override.model ?? "");
  const [temperature, setTemperature] = useState(numberToText(step.override.temperature));
  const [maxTokens, setMaxTokens] = useState(numberToText(step.override.max_tokens));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Model đang ghi đè nhưng không còn trong danh sách vẫn phải hiện để Admin thấy
  const modelOptions = model && !allowedModels.includes(model) ? [model, ...allowedModels] : allowedModels;

  const handleSave = async () => {
    const temp = parseOptionalNumber(temperature, "Temperature", 0, 2);
    const tokens = parseOptionalNumber(maxTokens, "Max tokens", 1, 16000, true);
    const problem = temp.error ?? tokens.error;
    if (problem) {
      setError(problem);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await saveStepOverride(step.step, { model: model || null, temperature: temp.value, max_tokens: tokens.value });
      onSaved(SAVED_MESSAGE);
    } catch (err) {
      setError(aiServiceErrorMessage(err, "Gọi thử thất bại, chưa lưu"));
      setSaving(false);
    }
  };

  return (
    <ModalShell
      title={`Sửa ghi đè: ${step.label}`}
      onClose={onClose}
      busy={saving}
      footer={
        <>
          <button onClick={onClose} disabled={saving} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">Huỷ</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-[#932120] text-white text-sm font-bold hover:bg-[#7a1a19] disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {saving ? "Đang gọi thử…" : "Lưu"}
          </button>
        </>
      }
    >
      <p className="text-xs text-zinc-500">
        Ghi đè áp dụng cho mọi prompt trong bước này. Hệ thống gọi thử model trước khi lưu; gọi thử lỗi thì không lưu.
      </p>
      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-zinc-700">Model</span>
        <select value={model} onChange={(e) => setModel(e.target.value)} disabled={saving} className={INPUT}>
          <option value="">Không ghi đè</option>
          {modelOptions.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-zinc-700">Temperature (0 đến 2, để trống = không ghi đè)</span>
        <input type="text" inputMode="decimal" value={temperature} onChange={(e) => setTemperature(e.target.value)} disabled={saving} className={INPUT} />
      </label>
      <label className="block space-y-1.5">
        <span className="text-xs font-bold text-zinc-700">Max tokens (1 đến 16000, để trống = không ghi đè)</span>
        <input type="text" inputMode="numeric" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} disabled={saving} className={INPUT} />
      </label>
      {error && <Notice kind="error">{error}</Notice>}
    </ModalShell>
  );
}
