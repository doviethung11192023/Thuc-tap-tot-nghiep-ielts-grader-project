"use client";

import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Download, Flag, Loader2, ShieldAlert, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import {
  getAdminExpertsPerformance,
  waiveExpertPenalty,
  type AdminExpertPerformanceRow,
} from "@/services/admin-reviews";
import type { ExpertPenaltyItem } from "@/types";
import { extractApiErrorMessage } from "@/lib/api-error";
import { AdminWaivePenaltyModal } from "@/components/admin/expert-governance/AdminWaivePenaltyModal";
import { exportExpertPerformanceCsv, TIER_BADGE_META } from "@/components/admin/expert-governance/admin-expert-kpi-utils";

export type ExpertKpiRow = AdminExpertPerformanceRow;

export function AdminExpertKpiTable({
  items: initialItems = [],
  interactive = false,
  onPenaltyWaived,
}: {
  items?: AdminExpertPerformanceRow[];
  interactive?: boolean;
  onPenaltyWaived?: () => void;
}) {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState("30d");
  const [tierFilter, setTierFilter] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [nowMs] = useState(() => Date.now());
  const [waiveTarget, setWaiveTarget] = useState<{
    expert: AdminExpertPerformanceRow;
    penalty: ExpertPenaltyItem;
  } | null>(null);
  const [waiving, setWaiving] = useState(false);

  const { data: report, isLoading } = useQuery({
    queryKey: ["admin-experts-performance", period, tierFilter, flaggedOnly],
    queryFn: () =>
      getAdminExpertsPerformance({
        period,
        tier: tierFilter || undefined,
        flagged_only: flaggedOnly,
      }),
    enabled: interactive,
    staleTime: 30 * 1000,
  });

  const items = interactive ? (report?.items ?? initialItems) : initialItems;
  const periods = report?.available_periods ?? [];

  const handleConfirmWaive = async (penaltyId: string, waiveReason: string) => {
    try {
      setWaiving(true);
      await waiveExpertPenalty(penaltyId, waiveReason);
      toast.success("Đã miễn phạt và tính lại hạng Chuyên gia!");
      setWaiveTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-experts-performance"] });
      onPenaltyWaived?.();
    } catch (err: unknown) {
      toast.error(extractApiErrorMessage(err, "Không thể miễn phạt lúc này"));
    } finally {
      setWaiving(false);
    }
  };

  return (
    <div className="bg-white p-5 sm:p-7 rounded-2xl border border-zinc-200 shadow-xs w-full space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-zinc-900 flex items-center gap-2.5">
            <Award className="w-5 h-5 text-[#932120]" /> Hiệu Suất 4-Tier &amp; Kỷ Luật Chuyên Gia (FR-50, FR-51)
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {items.length} chuyên gia · {items.filter((e) => (e.rubber_stamp_count ?? 0) > 0).length} nghi vấn chấm vội ·{" "}
            {items.reduce((sum, e) => sum + (e.active_penalties_30d ?? 0), 0)} vi phạm hiệu lực
          </p>
        </div>

        {interactive && (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Chọn kỳ thống kê"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
            >
              <option value="30d">30 ngày gần nhất</option>
              {periods.map((ym) => (
                <option key={ym} value={ym}>Tháng {ym}</option>
              ))}
            </select>

            <select
              aria-label="Lọc theo hạng Chuyên gia"
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#932120]/20"
            >
              <option value="">Tất cả hạng (4-Tier)</option>
              <option value="top_expert">Top Expert</option>
              <option value="high_performer">High Performer</option>
              <option value="standard">Standard</option>
              <option value="probation">Probation</option>
            </select>

            <button
              type="button"
              onClick={() => setFlaggedOnly((prev) => !prev)}
              className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                flaggedOnly
                  ? "bg-amber-100 text-amber-900 border-amber-300"
                  : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
              }`}
            >
              <Flag className="w-3.5 h-3.5" /> Nghi vấn chấm vội
            </button>

            <button
              type="button"
              onClick={() => exportExpertPerformanceCsv(items, period)}
              disabled={items.length === 0}
              className="px-3 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-bold text-zinc-700 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45"
            >
              <Download className="w-3.5 h-3.5" /> Xuất CSV
            </button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto w-full border border-zinc-200 rounded-xl">
        <table className="w-full text-xs text-left text-zinc-600">
          <thead className="text-[11px] text-zinc-600 uppercase bg-zinc-50 border-b border-zinc-200 font-bold">
            <tr>
              <th scope="col" className="px-4 py-3.5">Chuyên gia</th>
              <th scope="col" className="px-4 py-3.5">Hạng &amp; Trạng thái</th>
              <th scope="col" className="px-4 py-3.5">Tải / Đã chấm</th>
              <th scope="col" className="px-4 py-3.5">Đúng hạn SLA / Sớm</th>
              <th scope="col" className="px-4 py-3.5">Đạt lần đầu / TB</th>
              <th scope="col" className="px-4 py-3.5">Hữu ích &amp; Rubber-stamp</th>
              <th scope="col" className="px-4 py-3.5 text-right">Vi phạm &amp; Miễn phạt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {isLoading && interactive && items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-10 text-center text-zinc-400">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1 text-[#932120]" />
                  Đang tải báo cáo hiệu suất...
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((exp) => {
                const tierMeta = TIER_BADGE_META[exp.tier || "standard"] || TIER_BADGE_META.standard;
                const activePens = exp.active_penalties || [];
                const locked = Boolean(
                  exp.is_suspended_by_penalty ||
                    (exp.cooldown_until && new Date(exp.cooldown_until).getTime() > nowMs),
                );
                return (
                  <tr key={exp.expert_id} className="bg-white hover:bg-zinc-50/70 transition-colors">
                    <td className="px-4 py-3.5 align-top">
                      <p className="font-bold text-zinc-900">{exp.full_name}</p>
                      <p className="text-[11px] text-zinc-500">{exp.email}</p>
                    </td>
                    <td className="px-4 py-3.5 align-top space-y-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${tierMeta.cls}`}>
                        {tierMeta.label}
                      </span>
                      <div className="text-[11px]">
                        <span className={locked ? "text-rose-700 font-bold" : exp.is_available ? "text-emerald-700 font-semibold" : "text-zinc-500"}>
                          {locked ? "Đang Cooldown/Khóa" : exp.is_available ? "Sẵn sàng nhận bài" : "Tạm ngưng"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top font-mono tabular-nums">
                      <div className="font-bold text-zinc-900">{exp.active_reviews} / {exp.max_active_reviews} đang chấm</div>
                      <div className="text-[11px] text-zinc-500">{exp.completed_period ?? exp.completed_total} bài kỳ này</div>
                    </td>
                    <td className="px-4 py-3.5 align-top font-mono tabular-nums">
                      <div className="font-bold text-zinc-900">{exp.on_time_rate != null ? `${exp.on_time_rate}%` : "Chưa có"}</div>
                      <div className="text-[11px] text-zinc-500">Sớm: {exp.early_sla_rate != null ? `${exp.early_sla_rate}%` : "—"}</div>
                    </td>
                    <td className="px-4 py-3.5 align-top font-mono tabular-nums">
                      <div className="font-bold text-zinc-900">
                        {exp.completeness_first_pass_rate != null ? `${exp.completeness_first_pass_rate}%` : "—"}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        TB: {exp.avg_turnaround_hours != null ? `${exp.avg_turnaround_hours}h` : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 align-top space-y-1">
                      <div className="inline-flex items-center gap-1 font-mono tabular-nums font-bold text-zinc-800">
                        <ThumbsUp className="w-3 h-3 text-emerald-700" />
                        {exp.helpfulness_rate != null ? `${exp.helpfulness_rate}%` : "Chưa đủ 5"}
                      </div>
                      {(exp.rubber_stamp_count ?? 0) > 0 && (
                        <div>
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold">
                            {exp.rubber_stamp_count} nghi vấn vội
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 align-top text-right">
                      {activePens.length > 0 ? (
                        <div className="inline-flex flex-col items-end gap-1">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700">
                            <ShieldAlert className="w-3.5 h-3.5" /> {activePens.length} vi phạm
                          </span>
                          <button
                            type="button"
                            onClick={() => setWaiveTarget({ expert: exp, penalty: activePens[0] })}
                            className="px-2.5 py-1 rounded-lg border border-zinc-200 hover:border-[#932120] hover:text-[#932120] text-[11px] font-bold text-zinc-700 cursor-pointer"
                          >
                            Miễn phạt
                          </button>
                        </div>
                      ) : (
                        <span className="text-zinc-400">Không có</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-zinc-400">
                  Không có dữ liệu Chuyên gia khớp bộ lọc
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AdminWaivePenaltyModal
        expert={waiveTarget?.expert ?? null}
        penalty={waiveTarget?.penalty ?? null}
        submitting={waiving}
        onClose={() => setWaiveTarget(null)}
        onConfirm={(pid, reason) => void handleConfirmWaive(pid, reason)}
      />
    </div>
  );
}
