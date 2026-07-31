"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import type { EssayStatus } from "@/types";
import { getEssayResults } from "@/services/essays";

export function useRealtimeEssayStatus(essayId: string | null) {
  const [status, setStatus] = useState<EssayStatus>("pending");
  const [isError, setIsError] = useState(false);
  const statusRef = useRef<EssayStatus>("pending");

  // Keep ref in sync
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    if (!essayId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("pending");
    setIsError(false);

    let pollInterval: NodeJS.Timeout | null = null;
    let isPolling = false;

    const startPolling = () => {
      if (isPolling) return;
      isPolling = true;
      console.log("Starting fallback polling...");
      
      pollInterval = setInterval(async () => {
        if (statusRef.current === "completed" || statusRef.current === "failed" || statusRef.current === "rejected") {
          if (pollInterval) clearInterval(pollInterval);
          return;
        }

        try {
          const data = await getEssayResults(essayId);
          if (data && data.essay && data.essay.status !== statusRef.current) {
            setStatus(data.essay.status);
          }
        } catch (err) {
          console.error("Polling error:", err);
        }
      }, 5000);
    };

    const stopPolling = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      isPolling = false;
    };

    // Mặc định luôn bật Polling (Fallback an toàn nhất)
    // Supabase Realtime cần được bật thủ công trên Dashboard (Table -> Enable Realtime). 
    // Nếu user chưa bật, websocket sẽ kết nối thành công (SUBSCRIBED) nhưng không bao giờ nhận được event UPDATE.
    // Do đó, ta luôn cho chạy Polling song song mỗi 3s. Nếu Websocket chạy được thì nó sẽ bắt được event sớm hơn (0ms) và tắt Polling.
    startPolling();

    // Subscribe vào bảng `essays`
    const channel = supabase
      .channel(`essay-status-${essayId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "essays",
          filter: `id=eq.${essayId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as EssayStatus;
          setStatus(newStatus);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to Realtime! (Polling is also running as fallback)");
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          console.warn(`Realtime status: ${status}.`);
        }
      });

    return () => {
      stopPolling();
      supabase.removeChannel(channel);
    };
  }, [essayId]);

  return { status, isError };
}
