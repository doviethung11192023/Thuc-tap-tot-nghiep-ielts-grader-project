"use client";

import React from 'react';
import { CheckCircle2, AlertCircle, Clock, ArrowRight, Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AppNotification, sanitizeNotification } from '@/stores/notification-store';

interface NotificationItemProps {
  notification: AppNotification;
  onClick: (notification: AppNotification) => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const item = sanitizeNotification(notification);

  const getStatusBadge = () => {
    switch (item.type) {
      case 'grading_complete':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {item.band_score ? `Band ${item.band_score.toFixed(1)}` : 'Đã chấm xong'}
          </span>
        );
      case 'grading_failed':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-50 text-red-800 border border-red-200">
            Chưa chấm được
          </span>
        );
      case 'grading_pending':
        return (
          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            Đang phân tích
          </span>
        );
      default:
        return null;
    }
  };

  const getIcon = () => {
    switch (item.type) {
      case 'grading_complete':
        return (
          <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'grading_failed':
        return (
          <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center shrink-0 text-red-700">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
      case 'grading_pending':
        return (
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
            <Clock className="w-4 h-4 animate-spin" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 text-zinc-600">
            <Bell className="w-4 h-4" />
          </div>
        );
    }
  };

  let formattedDate = 'Vừa xong';
  try {
    formattedDate = formatDistanceToNow(new Date(item.created_at), {
      addSuffix: true,
      locale: vi,
    });
  } catch {}

  return (
    <button
      onClick={() => onClick(item)}
      className={`w-full text-left p-3.5 flex gap-3 items-start transition-all border-b border-zinc-100 last:border-0 hover:bg-zinc-50 cursor-pointer ${
        !item.read ? 'bg-red-50/20' : 'bg-white'
      }`}
    >
      {getIcon()}

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            {getStatusBadge()}
            <span className="text-xs font-bold text-zinc-900 truncate">
              {item.title}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400 shrink-0 font-medium">
            {formattedDate}
          </span>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
          {item.message}
        </p>

        <div className="flex items-center gap-1 text-[11px] font-bold text-[#932120] hover:text-[#7a1a19] pt-0.5">
          <span>{item.type === 'grading_failed' ? 'Thử lại bài viết' : 'Xem kết quả chi tiết'}</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {!item.read && (
        <span className="w-2 h-2 rounded-full bg-[#932120] shrink-0 mt-1.5" title="Chưa đọc" />
      )}
    </button>
  );
}
