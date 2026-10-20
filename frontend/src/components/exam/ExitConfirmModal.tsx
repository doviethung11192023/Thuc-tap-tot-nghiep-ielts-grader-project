"use client";

import React from 'react';
import { AlertTriangle, Save, X, ArrowLeft, LogOut } from 'lucide-react';

interface ExitConfirmModalProps {
  isOpen: boolean;
  mode: 'exam' | 'practice';
  onContinue: () => void;
  onExitDiscard: () => void;
  onSaveDraftAndExit?: () => void;
}

export function ExitConfirmModal({
  isOpen,
  mode,
  onContinue,
  onExitDiscard,
  onSaveDraftAndExit,
}: ExitConfirmModalProps) {
  if (!isOpen) return null;

  const isExam = mode === 'exam';

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-zinc-200 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className={`p-5 border-b flex items-center justify-between ${
          isExam ? 'bg-red-50/70 border-red-100' : 'bg-zinc-50 border-zinc-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isExam ? 'bg-red-100 text-[#932120]' : 'bg-amber-100 text-amber-700'
            }`}>
              {isExam ? <AlertTriangle className="w-5 h-5" /> : <Save className="w-5 h-5" />}
            </div>
            <div>
              <h3 className={`font-bold text-base ${isExam ? 'text-red-950' : 'text-zinc-900'}`}>
                {isExam ? 'Cảnh Báo Rời Phòng Thi' : 'Rời Khỏi Bài Luyện Tập'}
              </h3>
              <p className="text-xs text-zinc-500">
                {isExam ? 'Chế độ phòng thi chính thức' : 'Chế độ luyện tập tự do'}
              </p>
            </div>
          </div>
          <button 
            onClick={onContinue}
            className="text-zinc-400 hover:text-zinc-700 bg-white hover:bg-zinc-100 p-1.5 rounded-full transition-colors border border-zinc-200"
            title="Đóng modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Message */}
        <div className="p-6 space-y-4">
          {isExam ? (
            <div className="space-y-3">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs sm:text-sm leading-relaxed font-medium">
                <p className="font-bold text-red-950 mb-1 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  Bạn sẽ bị mất toàn bộ kết quả bài làm!
                </p>
                Bài thi đang trong thời gian tính giờ nghiêm ngặt. Hệ thống <strong className="text-red-950">KHÔNG cho phép lưu nháp</strong> ở chế độ phòng thi. Nếu bạn thoát ngay lúc này, bài thi sẽ bị hủy bỏ hoàn toàn.
              </div>
              <p className="text-xs text-zinc-500 italic text-center">
                Bạn có chắc chắn muốn hủy bài thi và rời khỏi phòng thi không?
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 text-xs sm:text-sm leading-relaxed">
                <p className="font-semibold text-blue-950 mb-1">
                  Bạn có muốn lưu nháp bài làm không?
                </p>
                Tiến độ trả lời hiện tại có thể được lưu lại vào máy để bạn tiếp tục luyện tập bất cứ lúc nào sau này.
              </div>
              <p className="text-xs text-zinc-500 text-center">
                Chọn phương thức bạn muốn khi rời khỏi trang:
              </p>
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="p-5 bg-zinc-50 border-t border-zinc-100 flex flex-col sm:flex-row gap-2.5 justify-end">
          <button
            onClick={onContinue}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 transition-colors order-3 sm:order-1"
          >
            Tiếp tục làm bài
          </button>

          {isExam ? (
            <button
              onClick={onExitDiscard}
              className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#932120] hover:bg-red-800 shadow-md transition-colors flex items-center justify-center gap-2 order-1 sm:order-2"
            >
              <LogOut className="w-4 h-4" /> Hủy bài & Thoát
            </button>
          ) : (
            <>
              <button
                onClick={onExitDiscard}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors order-2"
              >
                Thoát không lưu
              </button>
              <button
                onClick={onSaveDraftAndExit}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-colors flex items-center justify-center gap-2 order-1 sm:order-3"
              >
                <Save className="w-4 h-4" /> Lưu nháp & Thoát
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
