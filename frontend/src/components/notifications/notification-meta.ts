import type { AppNotification, NotificationType } from '@/stores/notification-store';

export interface NotificationStyleMeta {
  badgeLabel: string | null;
  badgeClass: string;
  iconBgClass: string;
  ctaLabel: string;
  iconKey:
    | 'grad'
    | 'clip'
    | 'send'
    | 'check'
    | 'alert'
    | 'spin'
    | 'flame'
    | 'snow'
    | 'award'
    | 'clock'
    | 'shield'
    | 'bell';
}

export function getNotificationMeta(item: AppNotification): NotificationStyleMeta {
  const t: NotificationType = item.type;
  switch (t) {
    case 'expert_complete':
      return {
        badgeLabel: item.band_score ? `Chính thức · Band ${item.band_score.toFixed(1)}` : 'Chuyên gia đã chấm',
        badgeClass: 'bg-teal-50 text-teal-800 border border-teal-200',
        iconBgClass: 'bg-teal-100 text-teal-700',
        ctaLabel: 'Xem điểm chính thức',
        iconKey: 'grad',
      };
    case 'expert_assigned':
    case 'expert_reassigned':
      return {
        badgeLabel: t === 'expert_reassigned' ? 'Điều phối mới' : 'Bài chấm mới',
        badgeClass: 'bg-red-50 text-[#932120] border border-red-200',
        iconBgClass: 'bg-red-100 text-[#932120]',
        ctaLabel: 'Mở trang chấm bài',
        iconKey: 'clip',
      };
    case 'expert_sla_warning':
      return {
        badgeLabel: 'Nhắc hạn SLA',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-300',
        iconBgClass: 'bg-amber-100 text-amber-700',
        ctaLabel: 'Vào chấm bài ngay',
        iconKey: 'clock',
      };
    case 'expert_sla_expired':
    case 'expert_penalty_notice':
      return {
        badgeLabel: t === 'expert_sla_expired' ? 'Quá hạn SLA' : 'Thông báo quy chế',
        badgeClass: 'bg-rose-50 text-[#932120] border border-rose-300',
        iconBgClass: 'bg-rose-100 text-[#932120]',
        ctaLabel: 'Xem hồ sơ hiệu suất',
        iconKey: 'shield',
      };
    case 'admin_expert_suspended':
      return {
        badgeLabel: 'Cảnh báo vận hành',
        badgeClass: 'bg-red-50 text-red-800 border border-red-300',
        iconBgClass: 'bg-red-100 text-red-700',
        ctaLabel: 'Kiểm tra điều phối',
        iconKey: 'alert',
      };
    case 'expert_requested':
      return {
        badgeLabel: 'Đã gửi Chuyên gia',
        badgeClass: 'bg-sky-50 text-sky-800 border border-sky-200',
        iconBgClass: 'bg-sky-100 text-sky-700',
        ctaLabel: 'Theo dõi trạng thái',
        iconKey: 'send',
      };
    case 'ai_complete':
    case 'grading_complete':
      return {
        badgeLabel: item.band_score ? `AI · Band ${item.band_score.toFixed(1)}` : 'AI đã chấm xong',
        badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
        iconBgClass: 'bg-emerald-100 text-emerald-700',
        ctaLabel: 'Xem kết quả chi tiết',
        iconKey: 'check',
      };
    case 'ai_failed':
    case 'grading_failed':
      return {
        badgeLabel: 'Chưa chấm được',
        badgeClass: 'bg-red-50 text-red-800 border border-red-200',
        iconBgClass: 'bg-red-100 text-red-700',
        ctaLabel: 'Kiểm tra & chấm lại',
        iconKey: 'alert',
      };
    case 'ai_grading':
    case 'grading_pending':
      return {
        badgeLabel: 'Đang phân tích',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
        iconBgClass: 'bg-amber-100 text-amber-700',
        ctaLabel: 'Xem kết quả chi tiết',
        iconKey: 'spin',
      };
    case 'streak_reminder':
      return {
        badgeLabel: 'Nhắc giữ chuỗi',
        badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200',
        iconBgClass: 'bg-amber-100 text-amber-700',
        ctaLabel: 'Luyện tập ngay',
        iconKey: 'flame',
      };
    case 'streak_freeze_used':
      return {
        badgeLabel: 'Streak Freeze',
        badgeClass: 'bg-sky-50 text-sky-800 border border-sky-200',
        iconBgClass: 'bg-sky-100 text-sky-700',
        ctaLabel: 'Xem chuỗi học tập',
        iconKey: 'snow',
      };
    case 'badge_unlocked':
      return {
        badgeLabel: 'Huy hiệu mới',
        badgeClass: 'bg-red-50 text-[#932120] border border-red-200',
        iconBgClass: 'bg-red-100 text-[#932120]',
        ctaLabel: 'Xem huy hiệu',
        iconKey: 'award',
      };
    default:
      return {
        badgeLabel: null,
        badgeClass: '',
        iconBgClass: 'bg-zinc-100 text-zinc-600',
        ctaLabel: 'Xem chi tiết',
        iconKey: 'bell',
      };
  }
}
