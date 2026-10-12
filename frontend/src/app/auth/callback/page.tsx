"use client";

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!session) throw new Error('Không tìm thấy phiên đăng nhập. Vui lòng thử lại.');

        // Lưu token cho api-client.ts sử dụng
        localStorage.setItem("supabase_access_token", session.access_token);

        // Kiểm tra xem user đã tồn tại trong public.users chưa
        const { data: userData } = await supabase
          .from('users')
          .select('role, is_activated')
          .eq('id', session.user.id)
          .single();

        // Kiểm tra tham số next chuyển hướng (ví dụ: /reset-password)
        const nextParam = searchParams.get('next');
        if (nextParam && nextParam.startsWith('/')) {
          router.push(nextParam);
          return;
        }

        // Tự động kích hoạt tài khoản nếu đăng nhập qua Google OAuth
        if (userData && userData.is_activated === false) {
          await supabase.from('users').update({ is_activated: true }).eq('id', session.user.id);
        }

        // Đăng nhập thành công, điều hướng theo vai trò
        toast.success('Đăng nhập thành công!');
        if (userData?.role === 'admin') {
          router.push('/admin/statistics');
        } else if (userData?.role === 'expert') {
          router.push('/expert/profile');
        } else {
          router.push('/history');
        }
        
      } catch (err: any) {
        console.error("Auth Callback Error:", err);
        setError(err.message || 'Lỗi xác thực. Vui lòng thử lại.');
      }
    };

    handleAuthCallback();
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-red-100 max-w-md w-full">
          <h2 className="text-xl font-bold text-red-600 mb-2">Lỗi Xác Thực</h2>
          <p className="text-zinc-600 mb-6 text-sm">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-[#932120] text-white rounded-lg hover:bg-[#7a1a19] transition-colors font-medium text-sm"
          >
            Quay lại trang Đăng nhập
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 font-sans">
      <Loader2 className="w-12 h-12 text-[#932120] animate-spin mb-4" />
      <h2 className="text-xl font-medium text-zinc-700">Đang hoàn tất xác thực...</h2>
      <p className="text-zinc-500 mt-2 text-sm">Vui lòng đợi trong giây lát</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-zinc-50 font-sans">
        <Loader2 className="w-12 h-12 text-[#932120] animate-spin mb-4" />
        <h2 className="text-xl font-medium text-zinc-700">Đang tải...</h2>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}
