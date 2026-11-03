import { useEffect } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useNotificationStore } from '@/stores/notification-store';

export function useGradingNotifications() {
  const { user } = useAuth();
  const { handleGradingResult } = useNotificationStore();

  useEffect(() => {
    if (!user?.id) return;

    // We use a unique channel name to avoid collisions
    const channelName = `grading-notifications-${user.id}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'free_essays',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newStatus = payload.new.status;
          const essayId = payload.new.id;

          if (newStatus === 'completed') {
            handleGradingResult(essayId, 'completed', {
              title: 'Bài viết IELTS Writing Task 2'
            });
            
            toast.success('🎉 Bài viết của bạn đã được chấm xong! Bấm vào 🔔 để xem nhận xét chi tiết.', {
              duration: 5000,
              icon: '🎉',
            });
          } else if (newStatus === 'failed') {
            handleGradingResult(essayId, 'failed', {
              title: 'Bài viết IELTS Writing Task 2',
              message: 'Quá trình chấm điểm gặp sự cố kỹ thuật. Bấm để kiểm tra hoặc gửi lại bài.'
            });
            
            toast.error('❌ Rất tiếc, có lỗi xảy ra khi chấm bài. Bấm vào 🔔 để kiểm tra.');
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("Supabase Realtime notification channel error:", err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, handleGradingResult]);
}
