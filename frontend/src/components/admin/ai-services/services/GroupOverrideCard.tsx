"use client";

import React, { useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { aiServiceErrorMessage } from "@/services/admin-ai-services";
import type { EffectiveParam } from "@/types/admin-ai-services";
import { ConfirmDialog } from "./ConfirmDialog";
import { Notice } from "./Notice";
import { EffectiveValue } from "./ParamSourceBadge";
import { parseOptionalNumber, SAVED_MESSAGE } from "./override-form-utils";

export interface GroupFieldDef {
  key: string;
  label: string;
  kind: "number" | "text" | "bool";
  min?: number;
  max?: number;
}

export type GroupBody = Record<string, string | number | boolean | null>;

interface GroupOverrideCardProps {
  title: string;
  description: string;
  fields: GroupFieldDef[];
  effective: Record<string, EffectiveParam<string | number | boolean>> | null;
  override: Record<string, string | number | boolean | undefined>;
  save: (body: GroupBody) => Promise<unknown>;
  onSaved: (message: string) => void;
}

const INPUT = "w-full px-3 py-2 rounded-xl border border-zinc-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/30 focus:border-[#932120]";

function initialText(value: string | number | boolean | undefined): string {
  return value === undefined ? "" : String(value);
}

/** Khối cấu hình theo nhóm (tham số chung LLM, bộ phân loại Jev): xem hiệu lực, sửa ghi đè, bỏ ghi đè. */
export function GroupOverrideCard({ title, description, fields, effective, override, save, onSaved }: GroupOverrideCardProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const hasOverride = Object.keys(override).length > 0;

  const startEdit = () => {
    setForm(Object.fromEntries(fields.map((f) => [f.key, initialText(override[f.key])])));
    setError(null);
    setEditing(true);
  };

  const buildBody = (): { body?: GroupBody; error?: string } => {
    const body: GroupBody = {};
    for (const f of fields) {
      const raw = form[f.key] ?? "";
      if (f.kind === "number") {
        const parsed = parseOptionalNumber(raw, f.label, f.min ?? 0, f.max ?? Number.MAX_SAFE_INTEGER);
        if (parsed.error) return { error: parsed.error };
        body[f.key] = parsed.value;
      } else if (f.kind === "bool") {
        body[f.key] = raw === "" ? null : raw === "true";
      } else {
        body[f.key] = raw.trim() || null;
      }
    }
    return { body };
  };

  const run = async (body: GroupBody, close: () => void) => {
    setSaving(true);
    setError(null);
    try {
      await save(body);
      close();
      onSaved(SAVED_MESSAGE);
    } catch (err) {
      setError(aiServiceErrorMessage(err, "Gọi thử thất bại, chưa lưu"));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = () => {
    const built = buildBody();
    if (built.error || !built.body) {
      setError(built.error ?? "Dữ liệu không hợp lệ");
      return;
    }
    void run(built.body, () => setEditing(false));
  };

  const handleReset = () => void run(Object.fromEntries(fields.map((f) => [f.key, null])), () => setConfirmReset(false));

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-zinc-900">{title}</h3>
          <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
        </div>
        {!editing && (
          <div className="flex gap-2 shrink-0">
            <button onClick={startEdit} className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Sửa
            </button>
            {hasOverride && (
              <button onClick={() => { setError(null); setConfirmReset(true); }} className="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-bold text-red-700 hover:bg-red-50">
                Bỏ ghi đè
              </button>
            )}
          </div>
        )}
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map((f) => (
          <div key={f.key}>
            <dt className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">{f.label}</dt>
            <dd className="space-y-1">
              <EffectiveValue value={effective?.[f.key]?.value} source={effective?.[f.key]?.source} />
              {override[f.key] !== undefined && <div className="text-xs text-[#932120] font-mono">Ghi đè: {String(override[f.key])}</div>}
            </dd>
          </div>
        ))}
      </dl>

      {editing && (
        <div className="border-t border-zinc-100 pt-4 space-y-3">
          {fields.map((f) => (
            <label key={f.key} className="block space-y-1.5">
              <span className="text-xs font-bold text-zinc-700">
                {f.label}
                {f.kind === "number" && ` (${f.min} đến ${f.max}, để trống = không ghi đè)`}
                {f.kind === "text" && " (để trống = không ghi đè)"}
              </span>
              {f.kind === "bool" ? (
                <select value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} disabled={saving} className={INPUT}>
                  <option value="">Không ghi đè</option>
                  <option value="true">Bật</option>
                  <option value="false">Tắt</option>
                </select>
              ) : (
                <input
                  type="text"
                  inputMode={f.kind === "number" ? "decimal" : undefined}
                  value={form[f.key] ?? ""}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  disabled={saving}
                  className={INPUT}
                />
              )}
            </label>
          ))}
          {error && <Notice kind="error">{error}</Notice>}
          <div className="flex justify-end gap-2.5">
            <button onClick={() => setEditing(false)} disabled={saving} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">Huỷ</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl bg-[#932120] text-white text-sm font-bold hover:bg-[#7a1a19] disabled:opacity-60 flex items-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Đang gọi thử…" : "Lưu"}
            </button>
          </div>
        </div>
      )}

      {confirmReset && (
        <ConfirmDialog
          title={`Bỏ ghi đè: ${title}`}
          message={<p>Mọi ghi đè của khối này bị xoá; giá trị quay về biến môi trường hoặc mặc định. Hệ thống gọi thử trước khi lưu.</p>}
          confirmLabel="Bỏ ghi đè"
          busyLabel="Đang gọi thử…"
          busy={saving}
          error={error}
          onConfirm={handleReset}
          onCancel={() => setConfirmReset(false)}
        />
      )}
    </div>
  );
}
