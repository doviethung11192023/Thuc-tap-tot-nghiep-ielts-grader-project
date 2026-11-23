import React from "react";
import type { ParamSource } from "@/types/admin-ai-services";

const LABELS: Record<ParamSource, { label: string; cls: string }> = {
  app: { label: "Trong app", cls: "bg-[#932120]/10 text-[#932120] border-[#932120]/20" },
  env: { label: "Biến môi trường", cls: "bg-amber-100 text-amber-800 border-amber-200" },
  langfuse: { label: "Langfuse", cls: "bg-sky-100 text-sky-800 border-sky-200" },
  default: { label: "Mặc định", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

export function ParamSourceBadge({ source }: { source: ParamSource }) {
  const info = LABELS[source] ?? LABELS.default;
  return <span className={`inline-flex px-2 py-0.5 rounded-full border text-[10px] font-bold whitespace-nowrap ${info.cls}`}>{info.label}</span>;
}

/** Giá trị đang có hiệu lực kèm nhãn nguồn. */
export function EffectiveValue({ value, source }: { value: string | number | boolean | null | undefined; source: ParamSource | undefined }) {
  if (value === null || value === undefined || !source) return <span className="text-zinc-400">-</span>;
  const text = typeof value === "boolean" ? (value ? "Bật" : "Tắt") : String(value);
  return (
    <div className="flex flex-col items-start gap-1">
      <span className="font-mono text-xs text-zinc-900 break-all">{text}</span>
      <ParamSourceBadge source={source} />
    </div>
  );
}
