"use client";

import apiClient from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppNotification, NotificationType } from "@/stores/notification-store";

export interface ServerNotificationDTO {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string | null;
  skill?: string | null;
  attempt_id?: string | null;
  essay_id?: string | null;
  metadata?: Record<string, unknown> | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationsListResponse {
  items: ServerNotificationDTO[];
  unread_count: number;
}

export function mapServerNotification(dto: ServerNotificationDTO): AppNotification {
  const bandRaw = dto.metadata && typeof dto.metadata.band === "number" ? dto.metadata.band : undefined;
  return {
    id: dto.id,
    attempt_id: dto.attempt_id || undefined,
    essay_id: dto.essay_id || undefined,
    title: dto.title,
    skill: dto.skill || undefined,
    band_score: bandRaw,
    message: dto.message,
    type: dto.type,
    action_url: dto.action_url || undefined,
    read: Boolean(dto.is_read),
    created_at: dto.created_at,
    source: "server",
  };
}

export async function fetchMyNotifications(limit = 30): Promise<NotificationsListResponse> {
  const res = await apiClient.get<NotificationsListResponse>("/api/v1/notifications", {
    params: { limit },
  });
  return res.data;
}

export async function markServerNotificationRead(notificationId: string): Promise<void> {
  await apiClient.patch(`/api/v1/notifications/${notificationId}/read`);
}

export async function markAllServerNotificationsRead(): Promise<void> {
  await apiClient.post("/api/v1/notifications/read-all");
}

export function useNotificationsQuery(enabled = true) {
  return useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => fetchMyNotifications(30),
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useNotificationMutations() {
  const queryClient = useQueryClient();

  const markReadMutation = useMutation({
    mutationFn: markServerNotificationRead,
    onMutate: async (notificationId: string) => {
      await queryClient.cancelQueries({ queryKey: ["my-notifications"] });
      const prev = queryClient.getQueryData<NotificationsListResponse>(["my-notifications"]);
      if (prev) {
        const target = prev.items.find((item) => item.id === notificationId);
        const wasUnread = target && !target.is_read;
        queryClient.setQueryData<NotificationsListResponse>(["my-notifications"], {
          items: prev.items.map((item) =>
            item.id === notificationId ? { ...item, is_read: true } : item
          ),
          unread_count: wasUnread ? Math.max(0, prev.unread_count - 1) : prev.unread_count,
        });
      }
      return { prev };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["my-notifications"], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: markAllServerNotificationsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["my-notifications"] });
      const prev = queryClient.getQueryData<NotificationsListResponse>(["my-notifications"]);
      if (prev) {
        queryClient.setQueryData<NotificationsListResponse>(["my-notifications"], {
          items: prev.items.map((item) => ({ ...item, is_read: true })),
          unread_count: 0,
        });
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        queryClient.setQueryData(["my-notifications"], ctx.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
    },
  });

  return { markReadMutation, markAllReadMutation };
}
