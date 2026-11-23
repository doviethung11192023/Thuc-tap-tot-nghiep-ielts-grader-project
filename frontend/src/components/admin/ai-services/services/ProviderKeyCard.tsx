import React from "react";
import { KeyRound } from "lucide-react";
import type { ProviderKeyStatus } from "@/types/admin-ai-services";

function sourceText(p: ProviderKeyStatus): string {
  if (p.source === "app") return "Trong app";
  if (p.source === "env") return ".env";
  return p.env_known ? "Chưa có" : "Không rõ (AI engine không kết nối)";
}

interface ProviderKeyCardProps {
  provider: ProviderKeyStatus;
  onReplace: () => void;
  onRevert: () => void;
}

/** Trạng thái che của một key: chỉ hiện 4 ký tự cuối, không bao giờ có key đầy đủ. */
export function ProviderKeyCard({ provider, onReplace, onRevert }: ProviderKeyCardProps) {
  const unknown = provider.source === "none" && !provider.env_known;
  const badge = unknown
    ? { text: "Không rõ", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" }
    : provider.configured
      ? { text: "Đã cấu hình", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" }
      : { text: "Chưa cấu hình", cls: "bg-red-100 text-red-700 border-red-200" };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-black text-zinc-900 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#932120]" /> {provider.label}
        </h3>
        <span className={`px-2.5 py-1 rounded-full border text-xs font-bold ${badge.cls}`}>{badge.text}</span>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
        <div>
          <dt className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Key</dt>
          <dd className="font-mono text-zinc-900">{provider.last4 ? `…${provider.last4}` : "-"}</dd>
        </div>
        <div>
          <dt className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Nguồn</dt>
          <dd className="text-zinc-900">{sourceText(provider)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Đổi lần cuối</dt>
          <dd className="text-zinc-900">
            {provider.updated_at ? new Date(provider.updated_at).toLocaleString("vi-VN") : "-"}
            {provider.updated_by_email ? ` bởi ${provider.updated_by_email}` : ""}
          </dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2.5">
        <button
          onClick={onReplace}
          disabled={!provider.encryption_ready}
          title={provider.encryption_ready ? undefined : "Chưa bật mã hoá key"}
          className="px-4 py-2 rounded-xl bg-[#932120] text-white text-sm font-bold hover:bg-[#7a1a19] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Thay key
        </button>
        {provider.source === "app" && (
          <button onClick={onRevert} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50">
            Dùng lại key trong .env
          </button>
        )}
      </div>
    </div>
  );
}
