"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiErrorMessage, updateAiPricing } from "@/services/admin-ai-monitoring";
import type { ModelPrice, PricingConfig } from "@/types/admin-ai-monitoring";

interface Row { model: string; input: string; output: string }

const FIELD = "min-h-[38px] rounded-lg border border-zinc-200 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#932120]/30";

const toText = (v: number | null | undefined) => (v === null || v === undefined ? "" : String(v));
/** Ô trống = chưa có giá (null). Trả NaN nếu không phải số không âm để báo lỗi. */
function parsePrice(text: string): number | null {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) && n >= 0 ? n : Number.NaN;
}

/** Bảng giá model (USD / 1M token) và ngân sách tháng; lưu bằng PUT /admin/ai-pricing. */
export function PricingEditor({ pricing }: { pricing: PricingConfig }) {
  // key theo dữ liệu server: sau khi lưu hoặc tải lại, form dựng lại từ giá trị mới nhất
  return <PricingForm key={JSON.stringify(pricing)} pricing={pricing} />;
}

function PricingForm({ pricing }: { pricing: PricingConfig }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<Row[]>(() =>
    Object.entries(pricing.prices).map(([model, p]) => ({ model, input: toText(p.input_per_1m), output: toText(p.output_per_1m) })));
  const [budget, setBudget] = useState(() => toText(pricing.budget_usd));

  const inUse = new Map(pricing.models_in_use.map((m) => [m.model, m.steps]));
  const patch = (i: number, p: Partial<Row>) => setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...p } : r)));

  const save = useMutation({
    mutationFn: () => {
      const prices: Record<string, ModelPrice> = {};
      for (const r of rows) {
        const name = r.model.trim();
        if (!name) throw new Error("Tên model không được để trống");
        if (name in prices) throw new Error(`Model ${name} bị trùng`);
        const input = parsePrice(r.input);
        const output = parsePrice(r.output);
        if (Number.isNaN(input) || Number.isNaN(output)) throw new Error(`Giá của ${name} phải là số không âm hoặc để trống`);
        prices[name] = { input_per_1m: input, output_per_1m: output };
      }
      const budgetValue = parsePrice(budget);
      if (Number.isNaN(budgetValue)) throw new Error("Ngân sách phải là số không âm hoặc để trống");
      return updateAiPricing({ prices, budget_usd: budgetValue });
    },
    onSuccess: () => {
      toast.success("Đã lưu bảng giá và ngân sách");
      void queryClient.invalidateQueries({ queryKey: ["admin-ai-pricing"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-ai-usage"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    },
    onError: (err) => toast.error(err instanceof Error && !("response" in err) ? err.message : apiErrorMessage(err, "Không lưu được bảng giá")),
  });

  return (
    <section className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-5">
      <div>
        <h3 className="text-base font-bold text-zinc-900">Bảng giá model và ngân sách</h3>
        <p className="text-xs text-zinc-500 mt-1">Giá tính bằng USD cho 1 triệu token. Để trống nếu chưa biết giá: lượt chấm sẽ hiện chi phí &quot;chưa rõ&quot;. Không bỏ được model đang được một bước AI sử dụng.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs uppercase text-zinc-600 font-bold">
            <tr><th className="py-2 pr-3">Model</th><th className="py-2 pr-3">Giá vào</th><th className="py-2 pr-3">Giá ra</th><th className="py-2" /></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const steps = inUse.get(r.model);
              return (
                <tr key={i}>
                  <td className="py-1.5 pr-3"><input aria-label="Model" className={`${FIELD} w-full min-w-[200px] font-mono text-xs`} value={r.model} onChange={(e) => patch(i, { model: e.target.value })} /></td>
                  <td className="py-1.5 pr-3"><input aria-label="Giá vào" inputMode="decimal" className={`${FIELD} w-28`} value={r.input} placeholder="chưa rõ" onChange={(e) => patch(i, { input: e.target.value })} /></td>
                  <td className="py-1.5 pr-3"><input aria-label="Giá ra" inputMode="decimal" className={`${FIELD} w-28`} value={r.output} placeholder="chưa rõ" onChange={(e) => patch(i, { output: e.target.value })} /></td>
                  <td className="py-1.5">
                    <button type="button" disabled={Boolean(steps)} onClick={() => setRows((prev) => prev.filter((_, idx) => idx !== i))}
                      title={steps ? `Đang được bước ${steps.join(", ")} sử dụng` : "Xoá model"} aria-label="Xoá model"
                      className="p-2 rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-30 disabled:hover:bg-transparent">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <button type="button" onClick={() => setRows((prev) => [...prev, { model: "", input: "", output: "" }])}
          className="min-h-[40px] px-4 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Thêm model
        </button>
        <label className="text-sm text-zinc-700">
          <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-1">Ngân sách tháng (USD, để trống = tắt cảnh báo)</span>
          <input inputMode="decimal" className={`${FIELD} w-44`} value={budget} placeholder="không đặt" onChange={(e) => setBudget(e.target.value)} />
        </label>
        <button type="button" disabled={save.isPending} onClick={() => save.mutate()}
          className="min-h-[40px] px-5 rounded-xl bg-[#932120] hover:bg-[#7a1a19] text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-60">
          {save.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu
        </button>
      </div>
    </section>
  );
}
