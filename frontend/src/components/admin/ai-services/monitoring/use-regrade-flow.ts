"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage, previewRegrade, runRegrade } from "@/services/admin-ai-monitoring";
import type { RegradePreview } from "@/types/admin-ai-monitoring";

export const MAX_REGRADE = 50;

/** Luồng chạy lại: xem trước (không ghi gì) → hộp xác nhận → gọi chạy lại thật → thông báo kết quả. */
export function useRegradeFlow(onDone: () => void) {
  const [attemptIds, setAttemptIds] = useState<string[]>([]);
  const [preview, setPreview] = useState<RegradePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const close = useCallback(() => {
    setPreview(null);
    setAttemptIds([]);
  }, []);

  const start = useCallback(async (ids: string[]) => {
    const unique = Array.from(new Set(ids));
    if (unique.length === 0) return;
    if (unique.length > MAX_REGRADE) {
      toast.error(`Tối đa ${MAX_REGRADE} bài mỗi lần chạy lại`);
      return;
    }
    setLoading(true);
    try {
      setPreview(await previewRegrade(unique));
      setAttemptIds(unique);
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không xem trước được đợt chạy lại"));
    } finally {
      setLoading(false);
    }
  }, []);

  const confirm = useCallback(async () => {
    setSubmitting(true);
    try {
      const res = await runRegrade(attemptIds);
      const queued = res.queued.length;
      const skipped = res.skipped.length;
      if (queued === 0) toast.error(`Không bài nào được chạy lại (${skipped} bài bị bỏ qua)`);
      else toast.success(`Đã đưa ${queued} bài vào hàng đợi chấm lại${skipped ? `, bỏ qua ${skipped} bài` : ""}`);
      close();
      onDone();
    } catch (err) {
      toast.error(apiErrorMessage(err, "Không chạy lại được"));
    } finally {
      setSubmitting(false);
    }
  }, [attemptIds, close, onDone]);

  return { preview, loading, submitting, start, confirm, close };
}
