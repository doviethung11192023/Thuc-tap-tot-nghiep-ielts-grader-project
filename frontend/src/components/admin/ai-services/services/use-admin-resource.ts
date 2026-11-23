"use client";

import { useCallback, useEffect, useState } from "react";
import { aiServiceErrorMessage } from "@/services/admin-ai-services";

interface ResourceState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
}

/** Tải dữ liệu khi mở trang; `reload()` tải lại. `fetcher` phải là hàm ổn định (hàm module). */
export function useAdminResource<T>(fetcher: () => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>({ data: null, error: null, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetcher()
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((err) => {
        if (!cancelled) setState((s) => ({ data: s.data, error: aiServiceErrorMessage(err, "Không tải được dữ liệu"), loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [fetcher, tick]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    setTick((t) => t + 1);
  }, []);

  return { ...state, reload };
}
