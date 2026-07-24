import React from 'react';
import { BookOpen } from 'lucide-react';

export function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-[#932120] text-white shadow-md">
      <div className="flex items-center gap-3">
        <div className="bg-white p-1.5 rounded-md">
          <BookOpen className="w-6 h-6 text-[#932120]" />
        </div>
        <span className="font-bold text-lg tracking-wider">
          HỌC VIỆN CÔNG NGHỆ BƯU CHÍNH VIỄN THÔNG
        </span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm font-medium bg-white/20 px-3 py-1.5 rounded-full">
          IELTS Writing Tool
        </div>
        <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center text-sm font-bold">
          ST
        </div>
      </div>
    </header>
  );
}
