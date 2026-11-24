"use client";

import React from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiErrorMessage, syncAiPricing } from "@/services/admin-ai-monitoring";
import type { ModelPrice, PriceSyncModelResult, PricingConfig } from "@/types/admin-ai-monitoring";
import { formatDateTime } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = { alibaba_official: "Trang giá Alibaba", litellm: "Bảng giá LiteLLM (dự phòng)" };
const fmt = (p?: ModelPrice) => (p ? `${p.input_per_1m ?? "?"} / ${p.output_per_1m ?? "?"}` : "");

function resultText(model: string, r: PriceSyncModelResult, current?: ModelPrice): string {
  if (r.status === "not_found") return `${model}: không tìm thấy ở nguồn, giữ giá đang có`;
  const source = r.source ? SOURCE_LABEL[r.source] ?? r.source : "";
  const base = r.status === "updated" ? `${model}: ${fmt(r.previous)} → ${fmt(current)}` : `${model}: không đổi`;
  return `${base} · ${source}${r.note ? ` · khuyến mãi: ${r.note}` : ""}`;
}

/** Trạng thái đồng bộ giá với nhà cung cấp (tự chạy 2 lần mỗi ngày) và nút kiểm ngay. */
export function PriceSyncPanel({ pricing }: { pricing: PricingConfig }) {
  const queryClient = useQueryClient();
  const sync = useMutation({
    mutationFn: syncAiPricing,
    onSuccess: (data) => {
      const changed = Object.values(data.sync?.models ?? {}).filter((r) => r.status === "updated").length;
      toast.success(changed ? `Đã cập nhật giá ${changed} model` : "Giá không đổi so với nhà cung cấp");
      queryClient.setQueryData(["admin-ai-pricing"], data);
      void queryClient.invalidateQueries({ queryKey: ["admin-ai-usage"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-alerts"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Không kiểm được giá với nhà cung cấp")),
  });
  const status = pricing.sync;

  return (
    <section className="bg-white p-5 sm:p-6 rounded-2xl border border-zinc-200 shadow-xs space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-zinc-900">Đồng bộ giá với nhà cung cấp</h3>
          <p className="text-xs text-zinc-500 mt-1">
            Hệ thống tự kiểm giá niêm yết của Alibaba Model Studio (vùng Singapore) 2 lần mỗi ngày. Giá đổi thì tự
            cập nhật và ghi nhật ký; giá sửa tay của model có trên trang giá sẽ bị thay ở lần kiểm sau. Chi phí các lượt chấm cũ giữ nguyên theo giá lúc chấm.
          </p>
        </div>
        <button type="button" disabled={sync.isPending} onClick={() => sync.mutate()}
          className="min-h-[40px] px-4 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 hover:bg-zinc-50 inline-flex items-center gap-2 disabled:opacity-60">
          {sync.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Kiểm giá ngay
        </button>
      </div>
      {!status ? (
        <p className="text-sm text-zinc-500">Chưa kiểm lần nào.</p>
      ) : (
        <div className="text-sm text-zinc-700 space-y-1">
          <p>
            Kiểm lần cuối: <strong>{formatDateTime(status.checked_at)}</strong>
            {" · "}Giá đổi lần cuối: <strong>{status.last_change_at ? formatDateTime(status.last_change_at) : "chưa có"}</strong>
          </p>
          <ul className="text-xs text-zinc-600 list-disc pl-5 space-y-0.5">
            {Object.entries(status.models).map(([model, r]) => (
              <li key={model} className={r.status === "updated" ? "text-emerald-700 font-semibold" : r.status === "not_found" ? "text-amber-700" : ""}>
                {resultText(model, r, pricing.prices[model])}
              </li>
            ))}
          </ul>
          {status.errors.length > 0 && <p className="text-xs text-red-700">Lỗi đọc nguồn: {status.errors.join("; ")}</p>}
        </div>
      )}
    </section>
  );
}
