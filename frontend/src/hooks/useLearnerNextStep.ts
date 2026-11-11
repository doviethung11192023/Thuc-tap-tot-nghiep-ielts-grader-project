"use client";

import { useEffect, useState } from "react";
import { getLearnerNextStep } from "@/services/learning-profile";
import type { LearnerNextStep } from "@/types/learning-profile";

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
    getLearnerNextStep()
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
