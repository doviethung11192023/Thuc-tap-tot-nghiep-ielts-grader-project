"use client";

import React from "react";
import { Calendar, Edit3, HelpCircle, Bot } from "lucide-react";
import type { LearningProfileGoals } from "@/types/learning-profile";

interface LearningProfileBannerProps {
  userName: string;
  goals: LearningProfileGoals;
  onOpenGoalModal: () => void;
}

export function LearningProfileBanner({ userName, goals, onOpenGoalModal }: LearningProfileBannerProps) {
  return (
    <div className="w-full bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-emerald-50/40 border border-sky-100/80 rounded-3xl p-6 sm:p-7 shadow-xs relative overflow-hidden">
      {/* Background subtle grid pattern */}
      <div 
        className="absolute inset-0 opacity-25 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(#0284c7 0.75px, transparent 0.75px)",
          backgroundSize: "20px 20px"
        }}
      />

      <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        {/* Left: Mascot & Greeting */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-sky-400 p-0.5 shadow-md shrink-0 flex items-center justify-center">
            <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center text-blue-600">
              <Bot className="w-9 h-9" />
            </div>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
              Hi, {userName}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-600 mt-1 font-medium">
              Hãy tiếp tục học mỗi ngày - nỗ lực của bạn sẽ được đền đáp!
            </p>
          </div>
        </div>

        {/* Right: Actions & 3-Column IELTS Level Card */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="flex items-center justify-end gap-3 text-xs font-semibold text-zinc-600">
              <button
                type="button"
                onClick={onOpenGoalModal}
                className="flex items-center gap-1.5 hover:text-[#932120] transition-colors cursor-pointer"
                title="Thay đổi ngày thi"
              >
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                <span>{goals.test_date ? `Ngày thi: ${goals.test_date}` : "Chọn ngày thi của bạn"}</span>
              </button>
              <button
                type="button"
                onClick={onOpenGoalModal}
                className="px-3 py-1 rounded-full border border-zinc-300 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Edit3 className="w-3 h-3 text-[#932120]" />
                <span>Chỉnh sửa hồ sơ</span>
              </button>
            </div>

            {/* Trình độ IELTS 3 cột */}
            <div className="bg-white rounded-2xl border border-zinc-200/90 p-3 sm:px-5 sm:py-3.5 shadow-2xs">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                Trình độ IELTS của bạn
              </p>
              <div className="grid grid-cols-3 gap-6 sm:gap-8 items-center text-center divide-x divide-zinc-100">
                <div className="pr-2">
                  <span className="text-[11px] text-zinc-500 font-medium block">Đầu vào</span>
                  <span className="text-lg font-black text-zinc-900">{goals.input_band.toFixed(1)}</span>
                </div>
                <div className="px-2">
                  <span className="text-[11px] text-zinc-500 font-medium inline-flex items-center justify-center gap-1">
                    Dự đoán
                    <span title="Tính từ điểm các bài thi gần nhất" className="inline-flex">
                      <HelpCircle className="w-3 h-3 text-blue-500" />
                    </span>
                  </span>
                  <span className="text-lg font-black text-blue-600 block">{goals.predicted_band.toFixed(1)}</span>
                </div>
                <div className="pl-2">
                  <span className="text-[11px] text-zinc-500 font-medium block">Mục tiêu</span>
                  <span className="text-lg font-black text-[#932120] block">{goals.target_band.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
