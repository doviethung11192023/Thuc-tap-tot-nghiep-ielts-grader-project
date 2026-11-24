"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import { X, LogIn, RefreshCw, ShieldAlert, ArrowLeft, GripVertical } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { RobotMascotLottie } from "./RobotMascotLottie";
import { TutorMascotLauncher } from "./TutorMascotLauncher";
import { useDraggablePosition } from "./useDraggablePosition";

interface TutorAuthNoticeDrawerProps {
  open: boolean;
  skill: "listening" | "reading";
  reason: "auth" | "role" | "mode" | "error";
  detail?: string | null;
  onOpen: () => void;
  onClose: () => void;
  onRetry: () => void;
}

export function TutorAuthNoticeDrawer({
  open,
  skill,
  reason,
  detail,
  onOpen,
  onClose,
  onRetry,
}: TutorAuthNoticeDrawerProps) {
  const router = useRouter();
  const getDefaultPos = useCallback((vw: number, vh: number) => ({ x: vw - 404, y: Math.max(76, vh - 460) }), []);
  const drag = useDraggablePosition({
    storageKey: "moonbot_popup_pos_v1",
    width: 384,
    height: 430,
    margin: 12,
    getDefaultPos,
  });

  if (!open) {
    return <TutorMascotLauncher botName="MoonBot AI" speed={0.95} enabled statusTone="amber" onOpen={onOpen} />;
  }

  const title =
    reason === "auth"
      ? "Đăng nhập để trò chuyện với MoonBot AI"
      : reason === "role"
      ? "Chế độ xem trước Quản trị / Giảng viên"
      : reason === "mode"
      ? "Đề thi chỉ dành cho Phòng thi (Mock)"
      : "Chưa kết nối được phiên Trợ lý AI";

  const message =
    reason === "mode"
      ? "Đề thi này được Admin cấu hình chỉ cho phép Thi thử (Mock Test), không mở chế độ Luyện tập. Hãy chọn các đề gắn nhãn Luyện tập + AI hoặc mục Luyện tập theo dạng bài để dùng MoonBot AI!"
      : detail ||
        (reason === "auth"
          ? "Phiên đăng nhập của bạn chưa có hoặc đã hết hạn. Hãy đăng nhập tài khoản Học viên để MoonBot AI đọc ngữ cảnh đề bài và hướng dẫn chiến thuật trực tiếp!"
          : reason === "role"
          ? "Trợ lý AI luyện tập gắn với phiên làm bài của Học viên. Vui lòng đăng nhập bằng tài khoản Learner để trải nghiệm đầy đủ."
          : "Không thể khởi tạo phiên luyện tập. Vui lòng thử tải lại trang.");

  return (
    <aside
      data-testid="ai-tutor-drawer"
      style={drag.pos ? { left: drag.pos.x, top: drag.pos.y } : { right: 20, bottom: 20 }}
      className="fixed z-50 w-[384px] max-w-[94vw] rounded-2xl overflow-hidden bg-zinc-50 border border-zinc-200 flex flex-col shadow-2xl"
    >
      <div className="h-1 w-full bg-gradient-to-r from-[#932120] via-sky-500 to-cyan-400 shrink-0" />
      <div
        onPointerDown={drag.dragHandlers.onPointerDown}
        onPointerMove={drag.dragHandlers.onPointerMove}
        onPointerUp={drag.dragHandlers.onPointerUp}
        className={`bg-white border-b border-zinc-200 px-3.5 py-2.5 flex items-center justify-between select-none touch-none ${drag.dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-zinc-400" />
          <RobotMascotLottie size={40} speed={1.0} enabled />
          <div>
            <p className="text-sm font-black text-zinc-900">MoonBot AI</p>
            <p className="text-[10px] font-semibold text-zinc-400 uppercase">
              {skill === "reading" ? "Reading Tutor" : "Listening Tutor"}
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500 cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-5 flex flex-col items-center justify-center text-center gap-4">
        <div className="animate-tutor-float">
          <RobotMascotLottie size={96} speed={1.05} enabled />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-black text-zinc-900 flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-[#932120]" />
            {title}
          </h3>
          <p className="text-xs leading-relaxed text-zinc-600">{message}</p>
        </div>
        <div className="flex items-center gap-2 w-full">
          {reason === "mode" ? (
            <button type="button" onClick={() => router.push("/test-practice")} className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#932120] text-white text-xs font-extrabold hover:bg-[#7a1a19] cursor-pointer">
              <ArrowLeft className="w-3.5 h-3.5" />
              Chọn đề Luyện tập khác
            </button>
          ) : (
            <button
              type="button"
              onClick={async () => {
                try {
                  localStorage.removeItem("supabase_access_token");
                  await supabase.auth.signOut();
                } catch {
                  // ignore signout error
                }
                router.push("/login");
              }}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#932120] text-white text-xs font-extrabold hover:bg-[#7a1a19] cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Đăng nhập ngay
            </button>
          )}
          <button type="button" onClick={onRetry} className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-zinc-700 text-xs font-bold hover:bg-zinc-100 cursor-pointer">
            <RefreshCw className="w-3.5 h-3.5" />
            Thử lại
          </button>
        </div>
      </div>
    </aside>
  );
}
