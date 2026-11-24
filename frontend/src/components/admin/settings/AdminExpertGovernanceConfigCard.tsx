"use client";

import React, { useState } from "react";
import { Loader2, Save, ShieldCheck, Users } from "lucide-react";
import type { SystemSetting } from "@/types/exam";

interface Props {
  settings: SystemSetting[];
  savingKey: string | null;
  onSave: (key: string, value: Record<string, unknown>) => Promise<void>;
}

const PRD_DEFAULTS = {
  min_criteria_count: 4,
  min_overall_feedback_chars: 50,
  min_criterion_comment_chars: 20,
  min_writing_annotations: 1,
  exempt_annotation_band: 8.5,
  min_change_reason_chars: 15,
  min_study_tip_chars: 30,
  writing_rubber_stamp_sec: 90,
  speaking_rubber_stamp_sec: 120,
  require_speaking_part_feedback: true,
};

const STRICT_PRESET = {
  ...PRD_DEFAULTS,
  min_overall_feedback_chars: 80,
  min_criterion_comment_chars: 40,
  min_writing_annotations: 3,
};

type NumRuleKey = Exclude<keyof typeof PRD_DEFAULTS, "require_speaking_part_feedback">;

const RULE_FIELDS: Array<{ key: NumRuleKey; label: string; min: number; max: number; step?: number }> = [
  { key: "min_overall_feedback_chars", label: "Nhận xét tổng quan tối thiểu (ký tự)", min: 10, max: 500 },
  { key: "min_criterion_comment_chars", label: "Nhận xét từng tiêu chí tối thiểu (ký tự)", min: 5, max: 300 },
  { key: "min_writing_annotations", label: "Số annotation Writing tối thiểu", min: 0, max: 10 },
  { key: "exempt_annotation_band", label: "Miễn annotation từ Band >=", min: 6.0, max: 9.0, step: 0.5 },
  { key: "min_change_reason_chars", label: "Giải trình lệch >= 1.0 band (ký tự)", min: 5, max: 200 },
  { key: "min_study_tip_chars", label: "Gợi ý ôn tập đồng thuận AI (ký tự)", min: 10, max: 200 },
  { key: "writing_rubber_stamp_sec", label: "Ngưỡng cảnh báo chấm vội Writing (giây)", min: 15, max: 600 },
  { key: "speaking_rubber_stamp_sec", label: "Ngưỡng cảnh báo chấm vội Speaking (giây)", min: 15, max: 600 },
  { key: "min_criteria_count", label: "Số tiêu chí tối thiểu phải chấm", min: 1, max: 8 },
];

function extractPoolValue(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return Math.min(50, Math.max(1, Math.round(raw)));
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const n = Number((raw as { value?: unknown }).value);
    if (Number.isFinite(n)) return Math.min(50, Math.max(1, Math.round(n)));
  }
  return 3;
}

export function AdminExpertGovernanceConfigCard({ settings, savingKey, onSave }: Props) {
  const storedRules = settings.find((s) => s.key === "expert_completeness_rules")?.value as
    | Partial<typeof PRD_DEFAULTS>
    | undefined;
  const storedPool = settings.find((s) => s.key === "expert_cooldown_min_active_pool")?.value;

  const mergeRules = () => ({ ...PRD_DEFAULTS, ...(storedRules || {}) });
  const [rulesForm, setRulesForm] = useState(mergeRules);
  const [poolMin, setPoolMin] = useState(() => extractPoolValue(storedPool));
  const [submitting, setSubmitting] = useState(false);

  const sig = JSON.stringify({ rules: storedRules || {}, pool: storedPool ?? null });
  const [prevSig, setPrevSig] = useState(sig);
  if (prevSig !== sig) {
    setPrevSig(sig);
    setRulesForm(mergeRules());
    setPoolMin(extractPoolValue(storedPool));
  }

  const busy =
    submitting ||
    savingKey === "expert_completeness_rules" ||
    savingKey === "expert_cooldown_min_active_pool";

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onSave("expert_completeness_rules", rulesForm);
      await onSave("expert_cooldown_min_active_pool", { value: poolMin });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void handleSave(e)}
      className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-5"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-50 text-[#932120] flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-zinc-900">
              Cấu Hình Cổng Kiểm Tra &amp; Điều Hành Chuyên Gia (PRD_01)
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Chỉnh trực tiếp ngưỡng Completeness Gate (Pillar 1), chống duyệt vội và bảo vệ pool BR-26.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setRulesForm(PRD_DEFAULTS);
              setPoolMin(3);
            }}
            className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
          >
            Mặc định PRD (50/20/1)
          </button>
          <button
            type="button"
            onClick={() => setRulesForm(STRICT_PRESET)}
            className="px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-bold text-zinc-700 hover:bg-zinc-50 cursor-pointer"
          >
            Nghiêm ngặt (80/40/3)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {RULE_FIELDS.map((f) => (
          <label
            key={f.key}
            className="block p-3.5 rounded-2xl bg-[#FAF8F5] border border-zinc-200/80 space-y-1.5"
          >
            <span className="block text-xs font-bold text-zinc-800">{f.label}</span>
            <input
              type="number"
              min={f.min}
              max={f.max}
              step={f.step ?? 1}
              value={rulesForm[f.key]}
              onChange={(e) => {
                const raw = Number(e.target.value);
                if (!Number.isFinite(raw)) return;
                const clamped = Math.max(f.min, Math.min(f.max, raw));
                setRulesForm((prev) => ({ ...prev, [f.key]: clamped }));
              }}
              className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 bg-white text-sm font-black font-mono tabular-nums text-[#932120] focus:outline-none focus:ring-1 focus:ring-[#932120]"
            />
          </label>
        ))}

        <label className="block p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-1.5">
          <span className="flex items-center gap-1.5 text-xs font-bold text-zinc-900">
            <Users className="w-3.5 h-3.5 text-[#932120]" />
            Pool Expert tối thiểu (BR-26)
          </span>
          <input
            type="number"
            min={1}
            max={50}
            value={poolMin}
            onChange={(e) => {
              const raw = Number(e.target.value);
              if (Number.isFinite(raw)) setPoolMin(Math.max(1, Math.min(50, Math.round(raw))));
            }}
            className="w-full px-3 py-1.5 rounded-xl border border-amber-300 bg-white text-sm font-black font-mono tabular-nums text-[#932120] focus:outline-none focus:ring-1 focus:ring-[#932120]"
          />
          <span className="block text-[11px] text-zinc-600 leading-snug">
            Không khóa tự động Cooldown nếu số Expert sẵn sàng còn dưới mốc này.
          </span>
        </label>
      </div>

      <label className="inline-flex items-center gap-2.5 text-xs font-semibold text-zinc-800 cursor-pointer">
        <input
          type="checkbox"
          checked={rulesForm.require_speaking_part_feedback}
          onChange={(e) =>
            setRulesForm((prev) => ({ ...prev, require_speaking_part_feedback: e.target.checked }))
          }
          className="h-4 w-4 accent-[#932120] rounded"
        />
        <span>Bắt buộc Speaking phải có tối thiểu 1 ghi chú âm thanh hoặc tổng quan &ge; 100 ký tự</span>
      </label>

      <div className="flex justify-end pt-2 border-t border-zinc-100">
        <button
          type="submit"
          disabled={busy}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-xs sm:text-sm font-bold shadow-xs cursor-pointer disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Lưu Cấu Hình Chuyên Gia</span>
        </button>
      </div>
    </form>
  );
}
