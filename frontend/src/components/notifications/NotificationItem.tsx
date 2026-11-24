"use client";

import React from 'react';
import {
  AlertCircle,
  ArrowRight,
  Award,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Flame,
  GraduationCap,
  Send,
  ShieldAlert,
  Snowflake,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AppNotification, sanitizeNotification } from '@/stores/notification-store';
import { getNotificationMeta, type NotificationStyleMeta } from './notification-meta';

interface NotificationItemProps {
  notification: AppNotification;
  onClick: (notification: AppNotification) => void;
}

const ICONS: Record<NotificationStyleMeta['iconKey'], React.ReactNode> = {
  grad: <GraduationCap className="w-4 h-4" />,
  clip: <ClipboardCheck className="w-4 h-4" />,
  send: <Send className="w-4 h-4" />,
  check: <CheckCircle2 className="w-4 h-4" />,
  alert: <AlertCircle className="w-4 h-4" />,
  spin: <Clock className="w-4 h-4 animate-spin" />,
  flame: <Flame className="w-4 h-4" />,
  snow: <Snowflake className="w-4 h-4" />,
  award: <Award className="w-4 h-4" />,
  clock: <Clock className="w-4 h-4" />,
  shield: <ShieldAlert className="w-4 h-4" />,
  bell: <Bell className="w-4 h-4" />,
};

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const item = sanitizeNotification(notification);
  const meta = getNotificationMeta(item);

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
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.iconBgClass}`}>
        {ICONS[meta.iconKey]}
      </div>

      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 truncate">
            {meta.badgeLabel && (
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${meta.badgeClass}`}>
                {meta.badgeLabel}
              </span>
            )}
            <span className="text-xs font-bold text-zinc-900 truncate">{item.title}</span>
          </div>
          <span className="text-[10px] text-zinc-400 shrink-0 font-medium">{formattedDate}</span>
        </div>

        <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">{item.message}</p>

        <div className="flex items-center gap-1 text-[11px] font-bold text-[#932120] hover:text-[#7a1a19] pt-0.5">
          <span>{meta.ctaLabel}</span>
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>

      {!item.read && (
        <span className="w-2 h-2 rounded-full bg-[#932120] shrink-0 mt-1.5" title="Chưa đọc" />
      )}
    </button>
  );
}
