"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useNotificationStore, AppNotification } from '@/stores/notification-store';
import { useRouter } from 'next/navigation';
import { NotificationItem } from './NotificationItem';

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
  } = useNotificationStore();

  const unreadCount = getUnreadCount();

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
    markAsRead(notification.id);
    setIsOpen(false);
    if (notification.action_url) {
      router.push(notification.action_url);
    } else if (notification.type === 'grading_complete') {
      router.push(`/results/${notification.essay_id}`);
    } else {
      router.push('/history');
    }
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
              <h3 className="font-bold text-zinc-900 text-sm">Thông báo học tập</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-[#932120]">
                  {unreadCount} mới
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="text-zinc-600 hover:text-[#932120] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Đánh dấu đã đọc tất cả"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Đã đọc</span>
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => clearAll()}
                  className="text-zinc-400 hover:text-red-600 font-medium flex items-center gap-1 transition-colors cursor-pointer"
                  title="Xóa tất cả thông báo"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa hết</span>
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
                  Kết quả chấm điểm AI, nhận xét bài viết và thông báo hệ thống sẽ xuất hiện tại đây.
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
