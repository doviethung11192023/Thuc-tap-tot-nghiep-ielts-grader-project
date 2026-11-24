"use client";

import { useEffect, useState } from "react";
import { getLearnerNextStep } from "@/services/learning-profile";
import type { LearnerNextStep } from "@/types/learning-profile";

// Gọi sẵn khi trang Learning Profile vừa mở, song song với overview; trước đây phải chờ overview về mới có
// refreshKey để gọi, thành hai chặng nối tiếp. Chỉ dùng kết quả gọi sẵn nếu còn mới (tránh hiện số cũ).
const PREFETCH_MAX_AGE_MS = 15_000;
let prefetched: { at: number; promise: Promise<LearnerNextStep> } | null = null;

export function prefetchLearnerNextStep() {
  const promise = getLearnerNextStep();
  promise.catch(() => {}); // lỗi được xử lý khi hook dùng tới promise này
  prefetched = { at: Date.now(), promise };
}

function takeNextStepRequest(): Promise<LearnerNextStep> {
  const ready = prefetched && Date.now() - prefetched.at < PREFETCH_MAX_AGE_MS ? prefetched.promise : null;
  prefetched = null;
  return ready ?? getLearnerNextStep();
}

interface NextStepState {
  key: string | null;
  data: LearnerNextStep | null;
  error: string | null;
}

/**
 * Thẻ "Bước tiếp theo" (spec 005). Tải lại khi `refreshKey` đổi (mục tiêu, ngày thi hoặc số bài làm đổi),
 * nên lưu mục tiêu hay làm thêm bài thì thẻ cập nhật theo. Không cache: backend tính lại mỗi lần xem.
 * `loading` suy ra từ key: kết quả đang hiện thuộc key cũ thì đang tải.
 */
export function useLearnerNextStep(refreshKey: string) {
  const [state, setState] = useState<NextStepState>({ key: null, data: null, error: null });

  useEffect(() => {
    let cancelled = false;
    takeNextStepRequest()
      .then((data) => {
        if (!cancelled) setState({ key: refreshKey, data, error: null });
      })
      .catch(() => {
        if (!cancelled) setState((s) => ({ ...s, key: refreshKey, error: "Không tải được gợi ý bước tiếp theo" }));
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { nextStep: state.data, loading: state.key !== refreshKey, error: state.error };
}
