"use client";

import React, { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { aiServiceErrorMessage, getProviderKeys, revertProviderKey } from "@/services/admin-ai-services";
import type { ProviderKeyStatus } from "@/types/admin-ai-services";
import { ConfirmDialog } from "./ConfirmDialog";
import { Notice } from "./Notice";
import { ProviderKeyCard } from "./ProviderKeyCard";
import { ReplaceKeyModal } from "./ReplaceKeyModal";
import { useAdminResource } from "./use-admin-resource";

/** Trang API key: trạng thái che, thay key, quay về key trong .env. */
export function ProviderKeysPanel() {
  const { data, error, loading, reload } = useAdminResource(getProviderKeys);
  const [message, setMessage] = useState<string | null>(null);
  const [replacing, setReplacing] = useState<ProviderKeyStatus | null>(null);
  const [reverting, setReverting] = useState<ProviderKeyStatus | null>(null);
  const [revertBusy, setRevertBusy] = useState(false);
  const [revertError, setRevertError] = useState<string | null>(null);

  const handleReplaced = (text: string) => {
    setReplacing(null);
    setMessage(text);
    reload();
  };

  const handleRevert = async () => {
    if (!reverting) return;
    setRevertBusy(true);
    setRevertError(null);
    try {
      await revertProviderKey(reverting.provider);
      setMessage(`Đã quay về key trong .env cho ${reverting.label}, áp dụng cho lượt chấm mới trong tối đa 60 giây`);
      setReverting(null);
      reload();
    } catch (err) {
      setRevertError(aiServiceErrorMessage(err, "Gọi thử thất bại, chưa đổi"));
    } finally {
      setRevertBusy(false);
    }
  };

  const encryptionOff = data?.some((p) => !p.encryption_ready) ?? false;
  const envUnknown = data?.some((p) => !p.env_known) ?? false;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">API key của nhà cung cấp AI. Chỉ hiện 4 ký tự cuối; key đầy đủ không bao giờ được hiện lại.</p>
        <button onClick={reload} disabled={loading} className="p-2.5 border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-600 disabled:opacity-60 shrink-0" title="Tải lại">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#932120]" : ""}`} />
        </button>
      </div>

      {message && <Notice kind="success" onClose={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      {encryptionOff && <Notice kind="warning">Chưa bật mã hoá key (thiếu AI_SECRETS_ENCRYPTION_KEY). Chưa thể thay key trong app.</Notice>}
      {envUnknown && <Notice kind="warning">Không kết nối được AI engine nên chưa biết key trong .env.</Notice>}

      {loading && !data && (
        <div className="py-12 text-center text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-[#932120]" /> Đang tải…
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {data.map((p) => (
            <ProviderKeyCard key={p.provider} provider={p} onReplace={() => setReplacing(p)} onRevert={() => { setRevertError(null); setReverting(p); }} />
          ))}
        </div>
      )}

      {replacing && <ReplaceKeyModal provider={replacing} onClose={() => setReplacing(null)} onReplaced={handleReplaced} />}
      {reverting && (
        <ConfirmDialog
          title={`Dùng lại key trong .env: ${reverting.label}`}
          message={<p>Key đang lưu trong app (…{reverting.last4}) sẽ bị xoá và hệ thống dùng key trong .env của AI engine. Hệ thống gọi thử bằng key .env trước khi đổi.</p>}
          confirmLabel="Dùng key .env"
          busyLabel="Đang gọi thử…"
          busy={revertBusy}
          error={revertError}
          onConfirm={handleRevert}
          onCancel={() => setReverting(null)}
        />
      )}
    </div>
  );
}
