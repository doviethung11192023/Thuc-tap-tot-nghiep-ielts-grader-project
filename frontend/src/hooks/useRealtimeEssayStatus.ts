"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { EssayStatus } from "@/types";

// ============================================================
// HOOK: useRealtimeEssayStatus
//
// Đây là hook "trái tim" của luồng bất đồng bộ:
// 1. Sau khi nộp bài (API 1 trả về essay_id)
// 2. Frontend subscribe vào Supabase Realtime
// 3. Khi AI chấm xong, backend UPDATE status trong DB
// 4. Supabase Realtime tự đẩy event về đây
// 5. Hook cập nhật status → UI tự render lại
// ============================================================

export function useRealtimeEssayStatus(essayId: string | null) {
  const [status, setStatus] = useState<EssayStatus>("pending");

  useEffect(() => {
    if (!essayId) return;

    // Subscribe vào bảng `essays`, lắng nghe khi status thay đổi
    const channel = supabase
      .channel(`essay-status-${essayId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",      // Chỉ quan tâm khi có UPDATE
          schema: "public",
          table: "essays",
          filter: `id=eq.${essayId}`, // Chỉ theo dõi bài viết này
        },
        (payload) => {
          const newStatus = payload.new.status as EssayStatus;
          setStatus(newStatus);
        }
      )
      .subscribe();

    // Cleanup: hủy subscribe khi component unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [essayId]);

  return { status };
}
