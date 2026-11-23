"use client";

import React, { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import {
  aiServiceErrorMessage,
  getRuntimeConfig,
  saveJevOverride,
  saveLlmOverride,
  saveStepOverride,
} from "@/services/admin-ai-services";
import type { EffectiveParam, JevOverrideBody, LlmOverrideBody, RuntimeStepView } from "@/types/admin-ai-services";
import { ConfirmDialog } from "./ConfirmDialog";
import { GroupOverrideCard, type GroupFieldDef } from "./GroupOverrideCard";
import { Notice } from "./Notice";
import { SAVED_MESSAGE } from "./override-form-utils";
import { StepConfigTable } from "./StepConfigTable";
import { StepOverrideModal } from "./StepOverrideModal";
import { useAdminResource } from "./use-admin-resource";

const LLM_FIELDS: GroupFieldDef[] = [
  { key: "timeout_seconds", label: "Timeout LLM (giây)", kind: "number", min: 10, max: 600 },
  { key: "enable_thinking", label: "Chế độ thinking", kind: "bool" },
];
const JEV_FIELDS: GroupFieldDef[] = [
  { key: "model", label: "Model phân loại (Jev)", kind: "text" },
  { key: "timeout_seconds", label: "Timeout Jev (giây)", kind: "number", min: 1, max: 30 },
];

type ParamMap = Record<string, EffectiveParam<string | number | boolean>>;

/** Trang Cấu hình model: bảng 8 bước, tham số chung LLM, bộ phân loại Jev. */
export function RuntimeConfigPanel() {
  const { data, error, loading, reload } = useAdminResource(getRuntimeConfig);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<RuntimeStepView | null>(null);
  const [resetting, setResetting] = useState<RuntimeStepView | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleSaved = (text: string) => {
    setEditing(null);
    setMessage(text);
    reload();
  };

  const handleReset = async () => {
    if (!resetting) return;
    setResetBusy(true);
    setResetError(null);
    try {
      await saveStepOverride(resetting.step, { model: null, temperature: null, max_tokens: null });
      setResetting(null);
      handleSaved(SAVED_MESSAGE);
    } catch (err) {
      setResetError(aiServiceErrorMessage(err, "Gọi thử thất bại, chưa lưu"));
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Model và tham số đang có hiệu lực cho từng bước chấm. Ghi đè trong app có ưu tiên cao nhất; lưu xong áp dụng cho lượt chấm mới trong tối đa 60 giây.
        </p>
        <button onClick={reload} disabled={loading} className="p-2.5 border border-zinc-200 rounded-xl hover:bg-zinc-100 text-zinc-600 disabled:opacity-60 shrink-0" title="Tải lại">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#932120]" : ""}`} />
        </button>
      </div>

      {message && <Notice kind="success" onClose={() => setMessage(null)}>{message}</Notice>}
      {error && <Notice kind="error">{error}</Notice>}
      {data?.warning && <Notice kind="warning">{data.warning}. Các ghi đè hiện có vẫn được hiện bên dưới.</Notice>}

      {loading && !data && (
        <div className="py-12 text-center text-zinc-500">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2 text-[#932120]" /> Đang tải cấu hình…
        </div>
      )}

      {data && (
        <>
          <StepConfigTable steps={data.steps} onEdit={setEditing} onReset={(s) => { setResetError(null); setResetting(s); }} />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <GroupOverrideCard
              title="Tham số chung LLM"
              description="Timeout và chế độ thinking cho mọi lượt gọi LLM."
              fields={LLM_FIELDS}
              effective={data.llm.effective as ParamMap | null}
              override={data.llm.override}
              save={(body) => saveLlmOverride(body as unknown as LlmOverrideBody)}
              onSaved={handleSaved}
            />
            <GroupOverrideCard
              title="Bộ phân loại Jev"
              description="Model văn bản và timeout của bộ phân loại đề Writing (nhà cung cấp khác, không bị giới hạn bởi danh sách model)."
              fields={JEV_FIELDS}
              effective={data.jev.effective as ParamMap | null}
              override={data.jev.override}
              save={(body) => saveJevOverride(body as unknown as JevOverrideBody)}
              onSaved={handleSaved}
            />
          </div>
          {data.updated_at && (
            <p className="text-xs text-zinc-400">
              Cập nhật lần cuối {new Date(data.updated_at).toLocaleString("vi-VN")}
              {data.updated_by_email ? ` bởi ${data.updated_by_email}` : ""}
            </p>
          )}
        </>
      )}

      {editing && data && (
        <StepOverrideModal step={editing} allowedModels={data.allowed_models} onClose={() => setEditing(null)} onSaved={handleSaved} />
      )}
      {resetting && (
        <ConfirmDialog
          title={`Bỏ ghi đè: ${resetting.label}`}
          message={<p>Bước này quay về giá trị từ biến môi trường, Langfuse hoặc mặc định. Hệ thống gọi thử trước khi lưu.</p>}
          confirmLabel="Bỏ ghi đè"
          busyLabel="Đang gọi thử…"
          busy={resetBusy}
          error={resetError}
          onConfirm={handleReset}
          onCancel={() => setResetting(null)}
        />
      )}
    </div>
  );
}
