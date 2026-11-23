"use client";

import React from "react";
import { autosaveLabel, type AutosaveStatus } from "@/hooks/useServerAutosave";

/** Trạng thái tự lưu ở góc màn hình làm bài (spec 004 FR-004). */
export function AutosaveStatusBadge({ status, savedAt }: { status: AutosaveStatus; savedAt: Date | null }) {
  if (status === "idle" && !savedAt) return null;
  const warn = status === "retrying";
  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-4 left-4 z-40 rounded-full border px-3 py-1.5 text-xs font-medium shadow-sm ${
        warn ? "border-amber-300 bg-amber-50 text-amber-800" : "border-zinc-200 bg-white/90 text-zinc-600"
      }`}
    >
      {autosaveLabel(status, savedAt)}
    </div>
  );
}
