import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationType = 'grading_pending' | 'grading_complete' | 'grading_failed';

export interface AppNotification {
  id: string;
  essay_id: string;
  message: string;
  type: NotificationType;
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
  handleGradingResult: (essayId: string, status: 'completed' | 'failed') => void;
}

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      addNotification: (notification) => {
        const newNotification: AppNotification = {
          ...notification,
          id: crypto.randomUUID(),
          read: false,
          created_at: new Date().toISOString(),
        };
        set((state) => {
          // Prevent exact duplicates for pending (if we call it multiple times)
          if (notification.type === 'grading_pending') {
            const exists = state.notifications.some(
              (n) => n.essay_id === notification.essay_id && n.type === 'grading_pending'
            );
            if (exists) return state;
          }
          return { notifications: [newNotification, ...state.notifications] };
        });
      },
      updateNotificationStatus: (essayId, updates) => {
        set((state) => ({
          notifications: state.notifications.map((n) => 
            n.essay_id === essayId ? { ...n, ...updates } : n
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
      handleGradingResult: (essayId, status) => {
        set((state) => {
          const type = status === 'completed' ? 'grading_complete' : 'grading_failed';
          const message = status === 'completed' 
            ? `Bài viết #${essayId.split('-')[0]} đã được chấm xong!` 
            : `Đã có lỗi xảy ra khi chấm bài viết #${essayId.split('-')[0]}.`;
          
          const hasPending = state.notifications.some(n => n.essay_id === essayId && n.type === 'grading_pending');
          
          if (hasPending) {
            // Replace the pending notification with the completed/failed one
            return {
              notifications: state.notifications.map(n => 
                (n.essay_id === essayId && n.type === 'grading_pending') 
                  ? { ...n, type, message, read: false, created_at: new Date().toISOString() }
                  : n
              )
            };
          } else {
            // Add a brand new notification
            const newNotification: AppNotification = {
              id: crypto.randomUUID(),
              essay_id: essayId,
              message,
              type,
              read: false,
              created_at: new Date().toISOString(),
            };
            return { notifications: [newNotification, ...state.notifications] };
          }
        });
      },
    }),
    {
      name: 'ielts-grader-notifications', // name of the item in the storage (must be unique)
      storage: createJSONStorage(() => localStorage), 
    }
  )
);
