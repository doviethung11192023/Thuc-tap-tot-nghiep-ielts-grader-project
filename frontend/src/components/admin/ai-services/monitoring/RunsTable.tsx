"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { GradingRunItem } from "@/types/admin-ai-monitoring";
import { RunStatusBadge } from "./RunStatusBadge";
import { MODE_LABEL, SKILL_LABEL, formatCost, formatDateTime, formatLatency, formatNumber, formatPromptVersions, shortId } from "./monitoring-format";

interface Props {
  items: GradingRunItem[];
  selected: Set<string>;
  onToggle: (attemptId: string) => void;
  onToggleAll: (checked: boolean) => void;
}

const TH = "px-3 py-3 whitespace-nowrap";
const TD = "px-3 py-3 align-top";

/** Bảng lượt chấm AI; checkbox chọn theo attempt để chạy lại hàng loạt. */
export function RunsTable({ items, selected, onToggle, onToggleAll }: Props) {
  const selectable = items.filter((r) => r.attempt_id);
  const allChecked = selectable.length > 0 && selectable.every((r) => selected.has(r.attempt_id as string));
  return (
    <div className="overflow-x-auto w-full">
      <table className="w-full text-xs sm:text-sm text-left text-zinc-600">
        <thead className="text-xs text-zinc-600 uppercase bg-zinc-50 border-b border-zinc-200 font-bold">
          <tr>
            <th className={TH}>
              <input type="checkbox" aria-label="Chọn tất cả" checked={allChecked} onChange={(e) => onToggleAll(e.target.checked)} />
            </th>
            <th className={TH}>Thời gian</th>
            <th className={TH}>Attempt</th>
            <th className={TH}>Kỹ năng</th>
            <th className={TH}>Mode</th>
            <th className={TH}>Task</th>
            <th className={TH}>Trạng thái</th>
            <th className={TH}>Model</th>
            <th className={TH}>Prompt</th>
            <th className={`${TH} text-right`}>Token vào/ra</th>
            <th className={`${TH} text-right`}>Chi phí</th>
            <th className={`${TH} text-right`}>Chạy</th>
            <th className={TH}>Lỗi</th>
            <th className={TH}>Trace</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {items.length === 0 ? (
            <tr><td colSpan={14} className="px-6 py-10 text-center text-zinc-400">Không có lượt chấm nào khớp bộ lọc</td></tr>
          ) : items.map((r) => (
            <tr key={r.id} className="bg-white hover:bg-zinc-50/70 transition-colors">
              <td className={TD}>
                <input type="checkbox" aria-label={`Chọn ${shortId(r.attempt_id)}`} disabled={!r.attempt_id}
                  checked={r.attempt_id ? selected.has(r.attempt_id) : false} onChange={() => r.attempt_id && onToggle(r.attempt_id)} />
              </td>
              <td className={`${TD} whitespace-nowrap`}>
                <Link href={`/admin/ai-services/runs/${r.id}`} className="font-semibold text-[#932120] hover:underline">{formatDateTime(r.started_at)}</Link>
              </td>
              <td className={`${TD} font-mono`}>{shortId(r.attempt_id)}</td>
              <td className={TD}>{r.skill ? SKILL_LABEL[r.skill] ?? r.skill : "—"}</td>
              <td className={TD}>{r.mode ? MODE_LABEL[r.mode] ?? r.mode : "—"}</td>
              <td className={TD}>{r.task_no ? `Task ${r.task_no}` : "—"}</td>
              <td className={TD}><RunStatusBadge status={r.status} isStuck={r.is_stuck} /></td>
              <td className={`${TD} font-mono text-xs`}>{r.model ?? "—"}</td>
              <td className={`${TD} font-mono text-xs`}>{formatPromptVersions(r.prompt_versions)}</td>
              <td className={`${TD} text-right whitespace-nowrap`}>{formatNumber(r.input_tokens)} / {formatNumber(r.output_tokens)}</td>
              <td className={`${TD} text-right whitespace-nowrap`}>{r.status === "running" ? "—" : formatCost(r.cost_usd)}</td>
              <td className={`${TD} text-right whitespace-nowrap`}>{formatLatency(r.latency_ms)}</td>
              <td className={`${TD} max-w-[240px]`}>
                {r.error_short ? <p title={r.error_short} className="text-[11px] text-red-700 line-clamp-2">{r.error_short}</p> : <span className="text-zinc-400">—</span>}
              </td>
              <td className={TD}>
                {r.trace_url ? (
                  <a href={r.trace_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#932120] font-semibold hover:underline">
                    Mở <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : <span className="text-zinc-400">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
