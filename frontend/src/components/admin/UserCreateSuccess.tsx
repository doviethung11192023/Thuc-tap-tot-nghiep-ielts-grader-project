import React, { useState } from "react";
import { MailCheck, Info, Copy, Check } from "lucide-react";

interface UserCreateSuccessProps {
  email: string;
  role: "admin" | "expert";
  setupLink?: string | null;
  onClose: () => void;
}

export function UserCreateSuccess({
  email,
  role,
  setupLink,
  onClose,
}: UserCreateSuccessProps) {
  const [copiedLink, setCopiedLink] = useState(false);

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
          <MailCheck className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900">
          Đã tạo tài khoản & Gửi thư kích hoạt!
        </h3>
        <p className="text-xs text-zinc-600 mt-1">
          Hệ thống đã gửi email kèm nút kích hoạt tài khoản {role === "admin" ? "Admin" : "Expert"} tới{" "}
          <strong className="text-zinc-900 font-bold">{email}</strong>.
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold">Hướng dẫn người dùng kích hoạt:</p>
          <p className="text-blue-700">
            Người nhận chỉ cần mở email và bấm <strong>&quot;Kích hoạt tài khoản&quot;</strong> để thiết lập mật khẩu mới, hoặc chọn <strong>&quot;Liên kết Google&quot;</strong>.
          </p>
        </div>
      </div>

      {setupLink && (
        <details className="text-left border border-zinc-200 rounded-xl p-3 bg-zinc-50/50">
          <summary className="text-xs font-bold text-zinc-700 cursor-pointer hover:text-zinc-900 select-none">
            Tùy chọn: Sao chép liên kết kích hoạt dự phòng (Fallback Link)
          </summary>
          <div className="mt-2.5 space-y-1.5 pt-2 border-t border-zinc-200/60">
            <div className="flex justify-between items-center text-xs font-semibold text-zinc-600">
              <span>Liên kết đặt mật khẩu trực tiếp:</span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(setupLink || "");
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="inline-flex items-center gap-1 text-[#932120] hover:underline font-bold"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "Đã sao chép" : "Sao chép link"}
              </button>
            </div>
            <div className="text-xs text-zinc-500 font-mono break-all line-clamp-2 bg-white p-2 rounded-lg border border-zinc-200">
              {setupLink}
            </div>
          </div>
        </details>
      )}

      <div className="pt-2 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2.5 bg-[#932120] text-white rounded-xl text-sm font-bold hover:bg-[#7a1a19] shadow-sm transition-colors"
        >
          Hoàn tất
        </button>
      </div>
    </div>
  );
}
