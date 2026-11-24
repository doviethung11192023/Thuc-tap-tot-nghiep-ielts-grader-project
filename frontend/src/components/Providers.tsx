"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LazyMotion } from "motion/react";
import { Toaster } from "sonner";
import { GlobalCommandPalette } from "@/components/ui/command-palette";
import { isChunkLoadError, tryAutoRecoverChunkError } from "@/lib/chunk-error-recovery";

const loadMotionFeatures = () => import("motion/react").then((mod) => mod.domMax);

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error || event.message)) {
        tryAutoRecoverChunkError();
      }
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        event.preventDefault();
        tryAutoRecoverChunkError();
      }
    };
    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 2 * 60 * 1000, // 2 phút: bấm Back quay lại trang cũ hiển thị tức thì
            gcTime: 10 * 60 * 1000, // Giữ cache 10 phút trong bộ nhớ
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <LazyMotion features={loadMotionFeatures} strict>
        {children}
        <GlobalCommandPalette />
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            className: "font-sans",
          }}
        />
      </LazyMotion>
    </QueryClientProvider>
  );
}
