"use client";

import React from 'react';
import { Loader2, Mail, User as UserIcon } from 'lucide-react';

interface ProfileAccountFormProps {
  fullName: string;
  email: string;
  isUpdating: boolean;
  onNameChange: (value: string) => void;
  onSubmit: () => void;
}

export function ProfileAccountForm({
  fullName,
  email,
  isUpdating,
  onNameChange,
  onSubmit,
}: ProfileAccountFormProps) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-zinc-200 bg-zinc-50">
        <h3 className="font-bold text-zinc-800 text-sm">Thông tin cơ bản</h3>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
        className="p-6 space-y-5"
      >
        <div>
          <label htmlFor="profile-full-name" className="block text-sm font-medium text-zinc-700 mb-1">
            Họ và tên
          </label>
          <div className="relative">
            <UserIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              id="profile-full-name"
              name="full_name"
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120] transition-colors"
            />
          </div>
        </div>

        <div>
          <label htmlFor="profile-email" className="block text-sm font-medium text-zinc-700 mb-1">
            Địa chỉ Email
          </label>
          <div className="relative">
            <Mail className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              id="profile-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              disabled
              className="w-full pl-10 pr-4 py-2 border border-zinc-200 bg-zinc-100 text-zinc-500 rounded-lg text-sm cursor-not-allowed"
            />
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">Email không thể thay đổi do liên kết với tài khoản đăng nhập.</p>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isUpdating}
            className="bg-[#932120] text-white px-5 py-2.5 rounded-lg font-bold shadow-sm hover:bg-[#7a1a19] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
          >
            {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            <span>Lưu thay đổi</span>
          </button>
        </div>
      </form>
    </div>
  );
}
