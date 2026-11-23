"use client";

import React from "react";
import { X } from "lucide-react";

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  /** Đang lưu: khoá nút đóng và bấm ra ngoài. */
  busy?: boolean;
}

/** Khung hộp thoại dùng chung của trang Service AI. */
export function ModalShell({ title, onClose, children, footer, wide, busy }: ModalShellProps) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50" onClick={busy ? undefined : onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? "max-w-3xl" : "max-w-lg"} max-h-[90vh] flex flex-col`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="text-base font-black text-zinc-900">{title}</h2>
          <button onClick={onClose} disabled={busy} className="p-1.5 rounded-lg text-zinc-500 hover:bg-zinc-100 disabled:opacity-40" aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto space-y-4">{children}</div>
        {footer && <div className="px-5 py-4 border-t border-zinc-200 flex justify-end gap-2.5">{footer}</div>}
      </div>
    </div>
  );
}
