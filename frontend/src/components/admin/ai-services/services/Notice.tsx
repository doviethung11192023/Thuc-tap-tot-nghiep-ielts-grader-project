import React from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";

export type NoticeKind = "success" | "error" | "warning" | "info";

const STYLES: Record<NoticeKind, { box: string; icon: React.ReactNode }> = {
  success: { box: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> },
  error: { box: "bg-red-50 border-red-200 text-red-800", icon: <XCircle className="w-4 h-4 mt-0.5 shrink-0" /> },
  warning: { box: "bg-amber-50 border-amber-200 text-amber-800", icon: <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> },
  info: { box: "bg-sky-50 border-sky-200 text-sky-800", icon: <Info className="w-4 h-4 mt-0.5 shrink-0" /> },
};

/** Dải thông báo trong trang (thay cho alert). */
export function Notice({ kind, children, onClose }: { kind: NoticeKind; children: React.ReactNode; onClose?: () => void }) {
  const style = STYLES[kind];
  return (
    <div role={kind === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 px-4 py-3 rounded-xl border text-sm font-medium ${style.box}`}>
      {style.icon}
      <div className="flex-1 min-w-0 break-words">{children}</div>
      {onClose && (
        <button onClick={onClose} className="text-xs font-bold opacity-70 hover:opacity-100" aria-label="Đóng thông báo">
          Đóng
        </button>
      )}
    </div>
  );
}
