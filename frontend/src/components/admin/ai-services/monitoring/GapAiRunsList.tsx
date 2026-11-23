"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type { GapCaseDetail } from "@/types/admin-ai-monitoring";
import { RunStatusBadge } from "./RunStatusBadge";
import { formatPromptVersions } from "./monitoring-format";

/** Các lượt chấm AI của evaluation đang xem: model, phiên bản prompt, link trace. */
export function GapAiRunsList({ runs }: { runs: GapCaseDetail["ai"]["runs"] }) {
  if (runs.length === 0) return <p className="text-sm text-zinc-500">Evaluation này không có lượt chấm nào được ghi.</p>;
  return (
    <ul className="space-y-2">
      {runs.map((r) => (
        <li key={r.run_id} className="bg-white rounded-xl border border-zinc-200 px-3.5 py-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <Link href={`/admin/ai-services/runs/${r.run_id}`} className="font-semibold text-[#932120] hover:underline">{r.task_no ? `Task ${r.task_no}` : "Lượt chấm"}</Link>
          <RunStatusBadge status={r.status} />
          <span className="font-mono text-xs">{r.model ?? "—"}</span>
          <span className="font-mono text-xs text-zinc-600">{formatPromptVersions(r.prompt_versions)}</span>
          {r.trace_url && (
            <a href={r.trace_url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex items-center gap-1 text-[#932120] font-semibold hover:underline">
              Trace <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}
