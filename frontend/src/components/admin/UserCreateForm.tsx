import React from "react";
import { ShieldCheck, GraduationCap, Loader2 } from "lucide-react";

interface UserCreateFormProps {
  modalRole: "admin" | "expert";
  setModalRole: (role: "admin" | "expert") => void;
  accountEmail: string;
  setAccountEmail: (val: string) => void;
  accountName: string;
  setAccountName: (val: string) => void;
  expertBio: string;
  setExpertBio: (val: string) => void;
  expertMaxReviews: number;
  setExpertMaxReviews: (val: number) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export function UserCreateForm({
  modalRole,
  setModalRole,
  accountEmail,
  setAccountEmail,
  accountName,
  setAccountName,
  expertBio,
  setExpertBio,
  expertMaxReviews,
  setExpertMaxReviews,
  isSubmitting,
  onSubmit,
  onCancel,
}: UserCreateFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="flex border-b border-zinc-200 mb-2">
        <button
          type="button"
          onClick={() => setModalRole("admin")}
          className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            modalRole === "admin" ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-500" /> Quản trị viên (Admin)
        </button>
        <button
          type="button"
          onClick={() => setModalRole("expert")}
          className={`flex-1 pb-3 text-sm font-bold flex items-center justify-center gap-2 border-b-2 transition-colors ${
            modalRole === "expert" ? "border-[#932120] text-[#932120]" : "border-transparent text-zinc-400 hover:text-zinc-600"
          }`}
        >
          <GraduationCap className="w-4 h-4 text-[#932120]" /> Chuyên gia (Expert)
        </button>
      </div>

      <div className="flex items-center gap-2.5 text-zinc-900">
        {modalRole === "admin" ? <ShieldCheck className="w-6 h-6 text-amber-500" /> : <GraduationCap className="w-6 h-6 text-[#932120]" />}
        <h3 className="text-lg font-bold">{modalRole === "admin" ? "Tạo tài khoản Quản trị viên (Admin)" : "Tạo tài khoản Chuyên gia (Expert)"}</h3>
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Email {modalRole === "admin" ? "Admin" : "Chuyên gia"} *</label>
        <input type="email" required placeholder={modalRole === "admin" ? "admin@example.com" : "expert@example.com"} value={accountEmail} onChange={(e) => setAccountEmail(e.target.value)} className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]" />
      </div>

      <div>
        <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Họ và tên *</label>
        <input type="text" required placeholder={modalRole === "admin" ? "Admin Quản Trị" : "Thầy Cô / Chuyên Gia A"} value={accountName} onChange={(e) => setAccountName(e.target.value)} className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]" />
      </div>

      {modalRole === "expert" && (
        <>
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Số bài chấm đồng thời tối đa</label>
            <input type="number" min="1" max="20" value={expertMaxReviews} onChange={(e) => setExpertMaxReviews(Number(e.target.value))} className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]" />
          </div>
          <div>
            <label className="block text-xs font-bold text-zinc-700 uppercase mb-1">Tiểu sử / Bằng cấp chuyên môn (Bio)</label>
            <textarea rows={2} placeholder="IELTS 8.5 Overall, 5 năm kinh nghiệm chấm thi..." value={expertBio} onChange={(e) => setExpertBio(e.target.value)} className="w-full px-3.5 py-2.5 border border-zinc-300 rounded-xl text-sm text-zinc-900 focus:outline-none focus:border-[#932120] focus:ring-1 focus:ring-[#932120]" />
          </div>
        </>
      )}

      <div className="pt-3 flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2.5 border border-zinc-200 text-zinc-700 rounded-xl text-sm font-semibold hover:bg-zinc-50">Hủy</button>
        <button type="submit" disabled={isSubmitting} className={`px-5 py-2.5 text-white rounded-xl text-sm font-bold disabled:opacity-50 flex items-center gap-2 ${modalRole === "admin" ? "bg-zinc-900 hover:bg-black" : "bg-[#932120] hover:bg-[#7a1a19]"}`}>
          {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Xác nhận Tạo {modalRole === "admin" ? "Admin" : "Expert"}
        </button>
      </div>
    </form>
  );
}
