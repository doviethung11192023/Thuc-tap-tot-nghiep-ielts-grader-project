"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { ModalShell } from "./ModalShell";
import { Notice } from "./Notice";

interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  busyLabel?: string;
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Hộp xác nhận cho thao tác ảnh hưởng đến chấm bài (bỏ ghi đè, dùng lại key .env, đặt production). */
export function ConfirmDialog({ title, message, confirmLabel, busyLabel, busy, error, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <ModalShell
      title={title}
      onClose={onCancel}
      busy={busy}
      footer={
        <>
          <button onClick={onCancel} disabled={busy} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm font-bold text-zinc-700 hover:bg-zinc-50 disabled:opacity-50">
            Huỷ
          </button>
          <button onClick={onConfirm} disabled={busy} className="px-4 py-2 rounded-xl bg-[#932120] text-white text-sm font-bold hover:bg-[#7a1a19] disabled:opacity-60 flex items-center gap-2">
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {busy ? (busyLabel ?? "Đang xử lý…") : confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm text-zinc-700 space-y-2">{message}</div>
      {error && <Notice kind="error">{error}</Notice>}
    </ModalShell>
  );
}
