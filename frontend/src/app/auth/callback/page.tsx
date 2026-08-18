"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AuthCallbackPage() {
  const router = useRouter();
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
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (userError && userError.code === 'PGRST116') {
          // User chưa tồn tại (OAuth đăng ký mới) -> INSERT vào public.users
          const { error: insertError } = await supabase.from('users').insert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Người dùng mới',
            role: 'student' // Mặc định OAuth là student
          });

          if (insertError) {
            console.error("Lỗi khi thêm user mới:", insertError);
            throw new Error('Đăng nhập thành công nhưng lỗi đồng bộ tài khoản. Vui lòng liên hệ Admin.');
          }
          
          toast.success('Đăng ký & Đăng nhập thành công!');
          router.push('/history');
          return;
        } else if (userError) {
          throw userError;
        }

        // Đã có tài khoản
        toast.success('Đăng nhập thành công!');
        if (userData?.role === 'admin') {
          router.push('/admin/statistics');
        } else {
          router.push('/history');
        }
        
      } catch (err: any) {
        console.error("Auth Callback Error:", err);
        setError(err.message || 'Lỗi xác thực. Vui lòng thử lại.');
      }
    };

    handleAuthCallback();
  }, [router]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <div className="bg-white p-8 rounded-2xl shadow-sm text-center border border-red-100">
          <h2 className="text-xl font-bold text-red-600 mb-2">Lỗi Xác Thực</h2>
          <p className="text-zinc-600 mb-6">{error}</p>
          <button 
            onClick={() => router.push('/login')}
            className="px-6 py-2 bg-[#932120] text-white rounded-lg hover:bg-[#7a1a19] transition-colors font-medium"
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
      <h2 className="text-xl font-medium text-zinc-700">Đang hoàn tất đăng nhập...</h2>
      <p className="text-zinc-500 mt-2">Vui lòng đợi trong giây lát</p>
    </div>
  );
}
