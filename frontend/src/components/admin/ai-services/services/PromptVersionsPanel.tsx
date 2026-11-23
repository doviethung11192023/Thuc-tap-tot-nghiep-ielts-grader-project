"use client";

import React, { useCallback, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { aiServiceErrorMessage, getPromptDetail, setPromptProduction } from "@/services/admin-ai-services";
import type { PromptOverview } from "@/types/admin-ai-services";
import { ConfirmDialog } from "./ConfirmDialog";
import { Notice } from "./Notice";
import { PromptDetailView } from "./PromptDetailView";
import { PromptEditorModal } from "./PromptEditorModal";
import { formatPromptDate } from "./prompt-helpers";
import { useAdminResource } from "./use-admin-resource";

interface PromptVersionsPanelProps {
  prompt: PromptOverview;
  /** Báo trang cha tải lại danh sách và hiện thông báo. */
  onChanged: (message: string) => void;
}

/** Các phiên bản của một prompt, xem chi tiết, sửa thành bản mới, đặt production. */
export function PromptVersionsPanel({ prompt, onChanged }: PromptVersionsPanelProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const selected = picked !== null && prompt.versions.some((v) => v.version === picked)
    ? picked
    : (prompt.production_version ?? prompt.versions[0]?.version ?? null);

  const [editing, setEditing] = useState(false);
  const [promoting, setPromoting] = useState<number | null>(null);
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [promoteError, setPromoteError] = useState<string | null>(null);

  const fetchDetail = useCallback(
    () => (selected === null ? Promise.resolve(null) : getPromptDetail(prompt.name, selected)),
    [prompt.name, selected],
  );
  const { data: detail, error, loading } = useAdminResource(fetchDetail);
  const current = detail && detail.name === prompt.name && detail.version === selected ? detail : null;

  const handlePromote = async () => {
    if (promoting === null) return;
    setPromoteBusy(true);
    setPromoteError(null);
    try {
      const result = await setPromptProduction(prompt.name, promoting);
      setPromoting(null);
      const from = result.previous_version != null ? `v${result.previous_version}` : "chưa có";
      onChanged(`${prompt.name}: production đổi từ ${from} sang v${result.version}, hiệu lực sau tối đa 60 giây`);
    } catch (err) {
      setPromoteError(aiServiceErrorMessage(err, "Không đổi được phiên bản production"));
    } finally {
      setPromoteBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs p-5 space-y-5">
      <div>
        <h3 className="text-base font-black text-zinc-900 font-mono break-all">{prompt.name}</h3>
        <p className="text-xs text-zinc-500 mt-0.5">
          Production: {prompt.production_version != null ? `v${prompt.production_version}` : "chưa có"}. Chỉ liệt kê 5 phiên bản mới nhất và bản production.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-bold uppercase tracking-wider text-zinc-500 bg-zinc-50 border-b border-zinc-200">
              <th className="px-3 py-2">Phiên bản</th>
              <th className="px-3 py-2">Labels</th>
              <th className="px-3 py-2">Ngày tạo</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {prompt.versions.map((v) => (
              <tr key={v.version} className={`border-b border-zinc-100 last:border-0 ${v.version === selected ? "bg-[#932120]/5" : ""}`}>
                <td className="px-3 py-2 font-bold">
                  v{v.version}
                  {v.is_production && <span className="ml-2 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">production</span>}
                </td>
                <td className="px-3 py-2 text-xs text-zinc-600">{v.labels.length ? v.labels.join(", ") : "-"}</td>
                <td className="px-3 py-2 text-xs text-zinc-600">{formatPromptDate(v.created_at)}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap space-x-2">
                  <button onClick={() => setPicked(v.version)} disabled={v.version === selected} className="px-3 py-1 rounded-lg border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
                    Xem
                  </button>
                  {!v.is_production && (
                    <button onClick={() => { setPromoteError(null); setPromoting(v.version); }} className="px-3 py-1 rounded-lg border border-[#932120]/30 text-xs font-bold text-[#932120] hover:bg-[#932120]/5">
                      Đặt làm production
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {prompt.versions.length === 0 && (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-zinc-500">Chưa có phiên bản nào</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected !== null && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h4 className="text-sm font-black text-zinc-900">Chi tiết v{selected}</h4>
            <button onClick={() => setEditing(true)} disabled={!current} className="px-3 py-1.5 rounded-lg bg-[#932120] text-white text-xs font-bold hover:bg-[#7a1a19] disabled:opacity-50 inline-flex items-center gap-1.5">
              <Pencil className="w-3.5 h-3.5" /> Sửa thành phiên bản mới
            </button>
          </div>
          {error && <Notice kind="error">{error}</Notice>}
          {!current && loading && (
            <div className="py-6 text-center text-zinc-500 text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2 text-[#932120]" /> Đang tải…</div>
          )}
          {current && <PromptDetailView detail={current} />}
        </div>
      )}

      {editing && current && (
        <PromptEditorModal
          base={current}
          requiredVariables={prompt.required_variables}
          onClose={() => setEditing(false)}
          onCreated={(version) => {
            setEditing(false);
            onChanged(`Đã tạo phiên bản v${version} (chưa chạy)`);
          }}
        />
      )}
      {promoting !== null && (
        <ConfirmDialog
          title="Đặt làm production"
          message={
            <>
              <p>
                <span className="font-mono font-bold">{prompt.name}</span>: production đổi từ{" "}
                <b>{prompt.production_version != null ? `v${prompt.production_version}` : "chưa có"}</b> sang <b>v{promoting}</b>.
              </p>
              <p>Mọi lượt chấm mới dùng bản này, hiệu lực sau tối đa 60 giây.</p>
            </>
          }
          confirmLabel="Đặt làm production"
          busy={promoteBusy}
          error={promoteError}
          onConfirm={handlePromote}
          onCancel={() => setPromoting(null)}
        />
      )}
    </div>
  );
}
