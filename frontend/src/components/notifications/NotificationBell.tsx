"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotificationStore, AppNotification } from '@/stores/notification-store';
import {
  mapServerNotification,
  useNotificationMutations,
  useNotificationsQuery,
} from '@/services/notifications';
import { useRouter } from 'next/navigation';
import { safeInternalPath } from '@/lib/safe-redirect';
import { NotificationItem } from './NotificationItem';

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications: localNotifications,
    markAsRead: markLocalAsRead,
    markAllAsRead: markAllLocalAsRead,
    clearAll: clearLocalAll,
  } = useNotificationStore();

  const { data: serverData } = useNotificationsQuery(true);
  const { markReadMutation, markAllReadMutation } = useNotificationMutations();

  // Merge server notifications with active local pending notifications (avoid stale stuck pending when server completed)
  const notifications = useMemo(() => {
    const serverItems = (serverData?.items || []).map(mapServerNotification);
    const serverAttemptIds = new Set(
      serverItems.map((n) => n.attempt_id).filter((id): id is string => Boolean(id))
    );
    const serverEssayIds = new Set(
      serverItems.map((n) => n.essay_id).filter((id): id is string => Boolean(id))
    );
    const filteredLocal = localNotifications
      .map((n) => ({ ...n, source: 'local' as const }))
      .filter((n) => {
        if (n.type === 'grading_pending' || n.type === 'ai_grading') {
          if (n.attempt_id && serverAttemptIds.has(n.attempt_id)) return false;
          if (n.essay_id && serverEssayIds.has(n.essay_id)) return false;
        }
        return !serverItems.some((s) => s.id === n.id);
      });

    return [...serverItems, ...filteredLocal].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [serverData, localNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.read) {
      if (notification.source === 'server') {
        markReadMutation.mutate(notification.id);
      } else {
        markLocalAsRead(notification.id);
      }
    }
    setIsOpen(false);
    // action_url lấy từ DB: chỉ đi tới trang trong app (chặn //evil.com, javascript:...)
    const actionPath = safeInternalPath(notification.action_url, '');
    if (actionPath) {
      router.push(actionPath);
    } else if (notification.essay_id) {
      router.push(`/results/${notification.essay_id}`);
    } else {
      router.push('/history');
    }
  };

  const handleMarkAllRead = () => {
    markAllLocalAsRead();
    markAllReadMutation.mutate();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-black/10 transition-colors cursor-pointer"
        title="Thông báo"
        id="btn-notification-bell"
      >
        <Bell className="w-5 h-5 text-white/90" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[#932120] animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          id="popover-notification-panel"
          className="absolute right-0 mt-2 w-88 sm:w-96 bg-white rounded-2xl shadow-2xl border border-zinc-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-zinc-900 text-sm">Thông báo</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#932120]">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-zinc-600 hover:text-[#932120] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Đánh dấu đã đọc tất cả"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã đọc</span>
                </button>
              )}
              {localNotifications.length > 0 && (
                <button
                  onClick={() => clearLocalAll()}
                  className="text-zinc-400 hover:text-red-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Xóa thông báo tạm trên máy"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa tạm</span>
                </button>
              )}
            </div>
          </div>

          <div className="max-h-[380px] overflow-y-auto custom-scrollbar divide-y divide-zinc-100">
            {notifications.length === 0 ? (
              <div className="px-6 py-10 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-400 mb-1">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-zinc-800">Hộp thông báo trống</p>
                <p className="text-xs text-zinc-400 max-w-xs">
                  Kết quả chấm điểm AI, nhận xét Chuyên gia và thông báo hệ thống sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={handleNotificationClick}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
