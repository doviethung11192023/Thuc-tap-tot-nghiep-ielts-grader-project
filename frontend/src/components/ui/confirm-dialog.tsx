"use client";

import React, { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";
import { m, AnimatePresence } from "motion/react";
import { Button } from "./button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Accessible in-app confirmation modal replacing native window.confirm. */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!loading) onCancel();
          }}
        >
          <m.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="fixed inset-0 bg-zinc-950/45 backdrop-blur-[2px]"
          />
          <m.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            aria-describedby="confirm-dialog-desc"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 6 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--ux-line)] bg-[var(--ux-surface)] p-6 shadow-2xl"
          >
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              aria-label="Đóng hộp thoại"
              className="absolute right-4 top-4 rounded-lg p-1.5 text-[var(--ux-ink-3)] hover:bg-[var(--ux-surface-2)] hover:text-[var(--ux-ink)] transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-start gap-3.5">
              <div
                className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                  tone === "danger"
                    ? "bg-red-50 text-red-600 border-red-200"
                    : "bg-rose-50 text-[#932120] border-rose-200"
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5 pr-4">
                <h3 id="confirm-dialog-title" className="text-base font-extrabold text-[var(--ux-ink)]">
                  {title}
                </h3>
                <p id="confirm-dialog-desc" className="text-sm text-[var(--ux-ink-2)] leading-relaxed">
                  {description}
                </p>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <Button variant="outline" size="sm" onClick={onCancel} disabled={loading}>
                {cancelLabel}
              </Button>
              <Button
                variant={tone === "danger" ? "danger" : "primary"}
                size="sm"
                onClick={onConfirm}
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : confirmLabel}
              </Button>
            </div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  );
}
