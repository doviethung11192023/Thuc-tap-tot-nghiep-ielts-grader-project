"use client";

import React from 'react';
import Link from 'next/link';
import { BookOpen } from 'lucide-react';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-zinc-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-[#932120] p-3 rounded-xl shadow-lg">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
        </div>
        <div className="mt-6 flex justify-center border-b border-zinc-200">
          <Link href="/login" className="px-8 py-3 text-sm font-bold text-zinc-500 hover:text-zinc-700 transition-colors">
            Đăng nhập
          </Link>
          <Link href="/register" className="px-8 py-3 text-sm font-bold text-[#932120] border-b-2 border-[#932120]">
            Đăng ký
          </Link>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-2xl sm:px-10 border border-zinc-100">
          <form className="space-y-6" action="#" method="POST" onSubmit={(e) => e.preventDefault()}>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-zinc-700">
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-zinc-300 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-[#932120] focus:border-[#932120] sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-700">
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-zinc-300 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-[#932120] focus:border-[#932120] sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700">
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="appearance-none block w-full px-3 py-2 border border-zinc-300 rounded-lg shadow-sm placeholder-zinc-400 focus:outline-none focus:ring-[#932120] focus:border-[#932120] sm:text-sm transition-colors"
                />
              </div>
            </div>

            <div>
              <Link href="/dashboard">
                <button
                  type="button"
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#932120] hover:bg-[#7a1a19] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#932120] transition-all"
                >
                  Register
                </button>
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
