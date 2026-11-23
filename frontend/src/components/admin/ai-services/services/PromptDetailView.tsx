import React from "react";
import type { PromptDetail } from "@/types/admin-ai-services";

/** Nội dung một phiên bản prompt: các message và config JSON (chỉ đọc). */
export function PromptDetailView({ detail }: { detail: PromptDetail }) {
  return (
    <div className="space-y-4">
      {detail.prompt.map((m, i) => (
        <div key={i} className="rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-zinc-500">
            {i + 1}. {m.role}
          </div>
          <pre className="p-3 text-xs text-zinc-800 whitespace-pre-wrap break-words font-mono max-h-96 overflow-y-auto">{m.content}</pre>
        </div>
      ))}
      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-3 py-1.5 bg-zinc-50 border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-zinc-500">Config</div>
        <pre className="p-3 text-xs text-zinc-800 whitespace-pre-wrap font-mono">{JSON.stringify(detail.config, null, 2)}</pre>
      </div>
    </div>
  );
}
