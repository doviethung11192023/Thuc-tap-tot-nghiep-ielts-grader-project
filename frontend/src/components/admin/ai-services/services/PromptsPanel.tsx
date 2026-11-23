"use client";

import React, { useMemo, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { getPrompts } from "@/services/admin-ai-services";
import { Notice } from "./Notice";
import { groupPromptsByStep } from "./prompt-helpers";
import { PromptVersionsPanel } from "./PromptVersionsPanel";
import { useAdminResource } from "./use-admin-resource";

/** Trang Prompt: danh sách theo bước (trái) và phiên bản của prompt đang chọn (phải). */
export function PromptsPanel() {
  const { data, error, loading, reload } = useAdminResource(getPrompts);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const groups = useMemo(() => groupPromptsByStep(data ?? []), [data]);
  const selected = data?.find((p) => p.name === selectedName) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">Prompt chấm bài lưu trên Langfuse. Phiên bản mới chỉ chạy sau khi đặt làm production.</p>
        <button onClick={reload} disabled={loading} className="p-2.5 border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-600 disabled:opacity-60 shrink-0" title="Tải lại">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#932120]" : ""}`} />
        </button>
      </div>

      {message && <Notice kind="success" onClose={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}

      {loading && !data && (
        <div className="py-12 text-center text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-[#932120]" /> Đang tải prompt từ Langfuse…
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-[22rem_1fr] gap-5 items-start">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-3 space-y-4 max-h-[75vh] overflow-y-auto">
            {groups.map((g) => (
              <div key={g.step ?? "other"}>
                <div className="px-2 pb-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-500">{g.label}</div>
                <ul className="space-y-1">
                  {g.prompts.map((p) => (
                    <li key={p.name}>
                      <button
                        onClick={() => setSelectedName(p.name)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors ${
                          p.name === selectedName ? "bg-[#932120] text-white" : "hover:bg-zinc-100 text-zinc-800"
                        }`}
                      >
                        <div className="font-mono font-bold break-all">{p.name}</div>
                        <div className={p.name === selectedName ? "text-red-100" : "text-zinc-500"}>
                          Production: {p.production_version != null ? `v${p.production_version}` : "chưa có"}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {selected ? (
            <PromptVersionsPanel
              key={selected.name}
              prompt={selected}
              onChanged={(text) => {
                setMessage(text);
                reload();
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500">
              Chọn một prompt để xem phiên bản.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
