"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useNotificationStore, AppNotification } from '@/stores/notification-store';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const {
    notifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
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
    if (notification.type === 'grading_complete') {
      router.push(`/results/${notification.essay_id}`);
    } else if (notification.type === 'grading_failed') {
      // Just keep it open or navigate to history
      router.push(`/history`);
    } else if (notification.type === 'grading_pending') {
      // Just keep it open or navigate to history
      router.push(`/history`);
    }
  };

  const getIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'grading_complete':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'grading_failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'grading_pending':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-zinc-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-black/5 transition-colors"
      >
        <Bell className="w-5 h-5 text-white/90" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white border-2 border-[#932120]">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-zinc-200 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <h3 className="font-bold text-zinc-800">Thông báo</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs font-medium text-[#932120] hover:text-red-700 flex items-center gap-1 transition-colors"
              >
                <Check className="w-3.5 h-3.5" /> Đánh dấu đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[360px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-zinc-500 flex flex-col items-center justify-center gap-2">
                <Bell className="w-8 h-8 text-zinc-300" />
                <p className="text-sm">Chưa có thông báo nào</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-zinc-50 transition-colors border-b border-zinc-50 last:border-0 ${
                      !notification.read ? 'bg-blue-50/30' : ''
                    }`}
                  >
                    <div className="shrink-0 mt-0.5">{getIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm text-zinc-800 leading-snug ${
                          !notification.read ? 'font-semibold' : 'font-normal'
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="text-[11px] text-zinc-500 mt-1 font-medium">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="shrink-0 flex items-center justify-center w-3">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
