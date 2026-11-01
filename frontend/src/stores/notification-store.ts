import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationType = 'grading_pending' | 'grading_complete' | 'grading_failed';

export interface AppNotification {
  id: string;
  essay_id?: string;
  attempt_id?: string;
  title?: string;
  topic_title?: string;
  task_type?: string;
  skill?: string;
  band_score?: number;
  message: string;
  type: NotificationType;
  action_url?: string;
  read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: AppNotification[];
  addNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'created_at'>) => void;
  updateNotificationStatus: (essayId: string, updates: Partial<AppNotification>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  removeNotification: (id: string) => void;
  getUnreadCount: () => number;
  handleGradingResult: (essayId: string, status: 'completed' | 'failed', meta?: { title?: string; band?: number; message?: string }) => void;
}

export function sanitizeNotification(n: AppNotification): AppNotification {
  let title = n.title || n.topic_title;
  let message = n.message || '';
  const hashMatch = message.match(/#([a-f0-9]{6,})/i);

  if (hashMatch) {
    const rawId = hashMatch[1];
    if (n.type === 'grading_complete') {
      title = title || 'Bài viết IELTS Writing Task 2';
      message = 'Bài viết đã được AI hoàn tất phân tích 4 tiêu chí (TR, CC, LR, GRA). Bấm để xem kết quả chi tiết.';
      if (!n.action_url) n.action_url = `/results/${n.essay_id || rawId}`;
    } else if (n.type === 'grading_failed') {
      title = title || 'Bài viết IELTS Writing Task 2';
      message = 'Quá trình chấm bài bị gián đoạn hoặc gặp lỗi xử lý. Bấm để kiểm tra lịch sử hoặc gửi lại.';
      if (!n.action_url) n.action_url = `/history`;
    }
  }

  if (!title) {
    title = n.skill ? `Bài thi ${n.skill}` : 'Bài viết IELTS Writing Task 2';
  }

  return {
    ...n,
    title,
    message,
    action_url: n.action_url || (n.essay_id ? `/results/${n.essay_id}` : '/history')
  };
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      addNotification: (notification) => {
        const item: AppNotification = sanitizeNotification({
          ...notification,
          id: crypto.randomUUID(),
          read: false,
          created_at: new Date().toISOString(),
        });
        set((state) => {
          if (item.type === 'grading_pending' && item.essay_id) {
            const exists = state.notifications.some(
              (n) => n.essay_id === item.essay_id && n.type === 'grading_pending'
            );
            if (exists) return state;
          }
          return { notifications: [item, ...state.notifications] };
        });
      },
      updateNotificationStatus: (essayId, updates) => {
        set((state) => ({
          notifications: state.notifications.map((n) => 
            n.essay_id === essayId ? sanitizeNotification({ ...n, ...updates }) : n
          )
        }));
      },
      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        }));
      },
      markAllAsRead: () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, read: true })),
        }));
      },
      clearAll: () => {
        set({ notifications: [] });
      },
      removeNotification: (id) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }));
      },
      getUnreadCount: () => {
        return get().notifications.filter((n) => !n.read).length;
      },
      handleGradingResult: (essayId, status, meta) => {
        set((state) => {
          const type = status === 'completed' ? 'grading_complete' : 'grading_failed';
          const title = meta?.title || 'Bài viết IELTS Writing Task 2';
          const message = status === 'completed'
            ? (meta?.band 
                ? `Đạt Band ${meta.band.toFixed(1)} • AI đã chấm xong và chữa lỗi chi tiết toàn bài.`
                : 'Bài viết đã được AI hoàn tất phân tích 4 tiêu chí (TR, CC, LR, GRA). Bấm để xem kết quả chi tiết.')
            : (meta?.message || 'Quá trình chấm bài bị gián đoạn hoặc gặp lỗi xử lý. Bấm để gửi lại bài.');

          const hasPending = state.notifications.some(n => n.essay_id === essayId && n.type === 'grading_pending');
          const action_url = `/results/${essayId}`;

          if (hasPending) {
            return {
              notifications: state.notifications.map(n => 
                (n.essay_id === essayId && n.type === 'grading_pending') 
                  ? { ...n, type, title, message, action_url, band_score: meta?.band, read: false, created_at: new Date().toISOString() }
                  : n
              )
            };
          } else {
            const newNotification: AppNotification = {
              id: crypto.randomUUID(),
              essay_id: essayId,
              title,
              message,
              type,
              band_score: meta?.band,
              action_url,
              read: false,
              created_at: new Date().toISOString(),
            };
            return { notifications: [newNotification, ...state.notifications] };
          }
        });
      },
    }),
    {
      name: 'ielts-grader-notifications',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
