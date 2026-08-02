import React from 'react';
import { BookOpen, ArrowLeft } from 'lucide-react';

interface HeaderProps {
  onExitClick?: () => void;
}

export function Header({ onExitClick }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-[#932120] text-white shadow-md">
      <div className="flex items-center gap-3">
        <button 
          onClick={onExitClick}
          className="mr-2 flex items-center gap-2 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors bg-white/10 border border-white/20"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold">Thoát</span>
        </button>
        <div className="bg-white p-1.5 rounded-md hidden sm:block">
          <BookOpen className="w-6 h-6 text-[#932120]" />
        </div>
        <span className="font-bold text-lg tracking-wider hidden sm:block">
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
