"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { GapBlock, GapStats } from "@/types/admin-ai-monitoring";
import { CRITERION_LABEL, SKILL_LABEL, formatSigned } from "./monitoring-format";

export function GapNumbers({ stats }: { stats: GapStats | null | undefined }) {
  if (!stats) return <span className="text-sm text-zinc-400">chưa đủ dữ liệu</span>;
  return (
    <span className="text-sm text-zinc-700">
      lệch tuyệt đối TB <strong className="text-zinc-900">{stats.mean_abs.toFixed(2)}</strong>
      {" · "}lệch có dấu <strong className="text-zinc-900">{formatSigned(stats.mean_signed)}</strong>
      {" · "}n = <strong className="text-zinc-900">{stats.n}</strong>
    </span>
  );
}

/** Một khối số liệu chênh lệch: tổng + (mở ra) từng tiêu chí; bấm tiêu chí sang danh sách ca lệch. */
export function GapBlockView({ block, title }: { block: GapBlock; title?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-zinc-200 rounded-xl">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
        className="w-full flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-left hover:bg-zinc-50 rounded-xl">
        {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
        {title && <span className="font-mono text-sm font-bold text-zinc-900">{title}</span>}
        <span className="text-xs font-semibold uppercase text-zinc-500">Tổng</span>
        <GapNumbers stats={block.overall} />
      </button>
      {open && (
        <ul className="border-t border-zinc-100 divide-y divide-zinc-100">
          {block.by_criterion.length === 0 && <li className="px-4 py-3 text-sm text-zinc-400">chưa đủ dữ liệu</li>}
          {block.by_criterion.map((c) => (
            <li key={`${c.skill}-${c.code}`}>
              <Link href={`/admin/ai-gap?skill=${c.skill}&criterion=${c.code}`} className="flex flex-wrap items-center gap-x-3 px-4 py-2.5 hover:bg-zinc-50">
                <span className="w-20 text-xs text-zinc-500">{SKILL_LABEL[c.skill] ?? c.skill}</span>
                <span className="w-56 text-sm font-semibold text-[#932120]">{CRITERION_LABEL[c.code] ?? c.code}</span>
                <GapNumbers stats={c} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
