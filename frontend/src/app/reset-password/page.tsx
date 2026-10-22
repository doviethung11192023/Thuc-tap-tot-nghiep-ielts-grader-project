"use client";

import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserEmail(session.user.email || null);
        const { data: dbUser } = await supabase
          .from('users')
          .select('role')
          .eq('id', session.user.id)
          .single();
        if (dbUser) {
          setUserRole(dbUser.role);
        }
      }
    };
    checkSession();
  }, []);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Xác nhận mật khẩu không khớp!');
      return;
    }

    setLoading(true);
    try {
      const { data: updateData, error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        if (error.message.toLowerCase().includes('session') || error.message.toLowerCase().includes('token')) {
          toast.error('Phiên làm việc hoặc liên kết đã hết hạn. Vui lòng thử lại.');
          router.push('/forgot-password');
        } else {
          toast.error('Lỗi thiết lập mật khẩu: ' + error.message);
        }
        return;
      }

      // Đánh dấu tài khoản đã được kích hoạt trong public.users
      if (updateData?.user) {
        await supabase
          .from('users')
          .update({ is_activated: true })
          .eq('id', updateData.user.id);
      }

      toast.success('Kích hoạt tài khoản và thiết lập mật khẩu thành công!');
      
      // Chuyển hướng theo vai trò người dùng
      if (userRole === 'admin') {
        router.push('/admin/statistics');
      } else if (userRole === 'expert') {
        router.push('/expert/profile');
      } else {
        router.push('/history');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Đã có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const redirectTo = `${window.location.origin}/auth/callback`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo
        }
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi liên kết tài khoản Google');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans text-zinc-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-[#932120] p-3.5 rounded-2xl shadow-md text-white">
            <KeyRound className="w-8 h-8" />
          </div>
        </div>
        <h2 className="mt-5 text-center text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
          Kích hoạt tài khoản & Thiết lập mật khẩu
        </h2>
        <p className="mt-2 text-center text-xs sm:text-sm text-zinc-500 max-w-sm mx-auto">
          {userEmail ? (
            <span>
              Đang thiết lập cho tài khoản: <strong className="text-zinc-800">{userEmail}</strong>
              {userRole ? ` (${userRole.toUpperCase()})` : ''}
            </span>
          ) : (
            'Tạo mật khẩu an toàn để hoàn tất kích hoạt tài khoản của bạn trên IELTS Grader'
          )}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm sm:rounded-2xl sm:px-10 border border-zinc-200">
          <form className="space-y-4" onSubmit={handleUpdate}>
            <div>
              <label htmlFor="password" className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Mật khẩu mới *
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Tối thiểu 6 ký tự"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 pr-10 border border-zinc-300 rounded-lg text-sm text-zinc-900 bg-white placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 p-0.5"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-zinc-700 uppercase mb-1">
                Xác nhận mật khẩu *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                required
                placeholder="Nhập lại mật khẩu mới"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-lg text-sm text-zinc-900 bg-white placeholder:text-zinc-400 font-medium focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || googleLoading}
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-sm text-sm font-bold text-white bg-[#932120] hover:bg-[#7a1a19] focus:outline-none transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? 'Đang kích hoạt...' : 'Kích hoạt & Đặt mật khẩu'}
              </button>
            </div>
          </form>

          {/* Hoặc liên kết / đăng nhập bằng Google */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-zinc-400 font-bold">Hoặc</span>
            </div>
          </div>

          <button
            type="button"
            disabled={loading || googleLoading}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 border border-zinc-300 rounded-lg shadow-sm text-sm font-bold text-zinc-700 bg-white hover:bg-zinc-50 transition-colors disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            Liên kết & Đăng nhập bằng Google
          </button>
          <p className="mt-2.5 text-center text-xs text-zinc-400">
            Dành cho tài khoản Gmail muốn truy cập nhanh mà không cần nhớ mật khẩu
          </p>
        </div>
      </div>
    </div>
  );
}
